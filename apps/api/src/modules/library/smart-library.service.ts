import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { SchoolOperationalEventsService } from '../events/school-operational-events.service';
import { LibraryRepository } from './repositories/library.repository';
import { assertBarcode, barcodePrintMetrics } from './barcode-print';

type Input = Record<string, any>;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const text = (value: unknown, field: string, max = 500) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new BadRequestException(`${field} is required (up to ${max} characters).`);
  return value.trim();
};
const uuid = (value: unknown, field: string) => {
  if (typeof value !== 'string' || !UUID.test(value)) throw new BadRequestException(`${field} must be a valid identifier.`);
  return value.toLowerCase();
};
const page = (q: Input) => {
  const limit=Number(q.limit??50),offset=Number(q.offset??0);
  if(!Number.isSafeInteger(limit)||limit<1||!Number.isSafeInteger(offset)||offset<0)throw new BadRequestException('Use valid whole-number pagination.');
  return {limit:Math.min(100,limit),offset};
};
const loanSelect = `
SELECT l.*, c.barcode,c.accession_number,c.condition,c.status AS copy_status,
  i.title,i.author,b.borrower_type,b.subject_id,
  (SELECT count(*)::int FROM library_renewals r WHERE r.tenant_id=l.tenant_id AND r.loan_id=l.id) AS renewal_count,
  COALESCE((SELECT jsonb_agg(jsonb_build_object('previous_due_on',r.previous_due_on,'due_on',r.due_on,'created_at',r.created_at,'reason',r.reason) ORDER BY r.created_at) FROM library_renewals r WHERE r.tenant_id=l.tenant_id AND r.loan_id=l.id),'[]') AS renewals,
  CASE WHEN b.borrower_type='student' THEN concat_ws(' ',s.first_name,s.last_name) ELSE sp.display_name END AS borrower_name,
  COALESCE(s.admission_number,sp.staff_number,b.scan_code) AS borrower_number,
  (l.returned_at IS NULL AND l.due_on < (now() AT TIME ZONE 'Africa/Nairobi')::date) AS overdue
FROM library_copy_loans l
JOIN library_copies c ON c.tenant_id=l.tenant_id AND c.id=l.copy_id
JOIN library_catalog_items i ON i.tenant_id=c.tenant_id AND i.id=c.catalog_item_id
JOIN library_borrowers b ON b.tenant_id=l.tenant_id AND b.id=l.borrower_id
LEFT JOIN students s ON b.borrower_type='student' AND s.tenant_id=b.tenant_id AND s.id::text=b.subject_id::text
LEFT JOIN staff_profiles sp ON b.borrower_type='staff' AND sp.tenant_id=b.tenant_id AND sp.id::text=b.subject_id::text`;

@Injectable()
export class SmartLibraryService {
  constructor(
    private readonly db: PrismaService,
    private readonly context: RequestContextService,
    private readonly events: SchoolOperationalEventsService,
    private readonly repository: LibraryRepository,
  ) {}

  private scope() {
    const s = this.context.requireStore();
    if (!s.is_authenticated || !s.tenant_id || !s.user_id) throw new UnauthorizedException('An authenticated school session is required.');
    return { tenant: s.tenant_id, actor: s.user_id };
  }
  private async rows(sql: string, args: unknown[] = []): Promise<Input[]> { return (await this.db.query(sql, args)).rows; }
  private async one(sql: string, args: unknown[] = []): Promise<Input> {
    const row = (await this.rows(sql, args))[0];
    if (!row) throw new NotFoundException('Record not found in this school.');
    return row;
  }
  private async audit(type: string, entity: string, payload: Input = {}, borrowerId?: string) {
    const { tenant, actor } = this.scope();
    const id = randomUUID();
    await this.rows(`INSERT INTO library_audit_logs(tenant_id,actor_user_id,action,metadata) VALUES($1,$2::uuid,$3,$4::jsonb) RETURNING id`,
      [tenant, actor, type, JSON.stringify({ ...payload, entity_id: entity, event_id: id })]);
    const recipients = borrowerId ? await this.repository.listActiveNotificationRecipientsForBorrower(tenant, borrowerId) : [];
    await this.events.recordSchoolOperation({
      event: { id, type, module: 'library', title: type.split('.').slice(1).join(' ').replaceAll('_',' '),
        body: payload.message ?? 'The school library record has been updated.', entityId: entity, payload },
      notifications: [...recipients.map(r => ({ id: randomUUID(), audienceRoles: [r.recipient_kind === 'guardian' ? 'parent' : r.recipient_kind === 'staff' ? 'staff' : 'student'],
        targetUserId: r.user_id, recipientGuardianId:r.guardian_id, title: 'Library update', body: payload.message ?? 'Your library record has been updated.',
        sourceModule:'library',relatedModule:'library',relatedRecordId:entity, priority: 'normal' })),
        ...(type==='library.fine_created'?[{id:randomUUID(),audienceRoles:['accountant','bursar'],title:'Library fine recorded',
          body:`A configured library fine of ${payload.amount_minor} minor units requires finance review.`,
          sourceModule:'library',relatedModule:'finance',relatedRecordId:entity,priority:'normal'}]:[])],
    }, this.db.getActiveTransaction());
  }
  private async command(kind: string, input: Input, execute: () => Promise<Input>): Promise<Input> {
    const { tenant, actor } = this.scope();
    const key = uuid(input.request_id, 'Request ID');
    const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    return this.db.executeWithTenant(tenant, actor, async () => {
      // Prisma cannot deserialize PostgreSQL void; retain the transaction lock
      // while returning a supported scalar from this side-effecting query.
      await this.rows(`SELECT pg_advisory_xact_lock(hashtextextended($1,0))::text`, [`library:${tenant}:${key}`]);
      const previous = (await this.rows(`SELECT * FROM library_commands WHERE tenant_id=$1 AND request_id=$2::uuid`, [tenant,key]))[0];
      if (previous) {
        if (previous.kind !== kind || previous.request_hash !== hash) throw new ConflictException('This request ID was already used for different library details.');
        return previous.result;
      }
      const result = await execute();
      await this.rows(`INSERT INTO library_commands(tenant_id,request_id,kind,request_hash,result,created_by)
        VALUES($1,$2::uuid,$3,$4,$5::jsonb,$6::uuid) RETURNING request_id`, [tenant,key,kind,hash,JSON.stringify(result),actor]);
      return result;
    });
  }

  async allocate(input: Input) {
    const { tenant, actor } = this.scope();
    const quantity = input.quantity;
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100000) throw new BadRequestException('Choose 1 to 100,000 labels per batch. Create additional batches for larger orders.');
    return this.command('barcode.allocate', input, async () => {
      const batch = await this.one(`INSERT INTO library_barcode_batches(tenant_id,quantity,source,created_by)
        VALUES($1,$2,'generated',$3::uuid) RETURNING *`, [tenant,quantity,actor]);
      let allocated = 0, attempted = 0;
      while (allocated < quantity) {
        // nextval is global, bigint, non-cycling and never rolled back. Strings
        // travel end-to-end; occupied external/legacy numbers are skipped.
        const candidates = await this.rows(`SELECT CASE WHEN length(n::text)<6 THEN lpad(n::text,6,'0') ELSE n::text END AS barcode
          FROM (SELECT nextval('library_barcode_sequence') AS n FROM generate_series(1,$1::int)) numbers`,
        [Math.min(500, quantity - allocated)]);
        const values = candidates.map(r => r.barcode as string);
        const inserted = await this.rows(`INSERT INTO library_barcode_registry(barcode,tenant_id,batch_id,ordinal,created_by)
          SELECT value,$1,$2::uuid,$3::int+ordinality::int,$4::uuid FROM unnest($5::text[]) WITH ORDINALITY AS codes(value,ordinality)
          ON CONFLICT(barcode) DO NOTHING RETURNING barcode`, [tenant,batch.id,attempted,actor,values]);
        allocated += inserted.length;
        attempted += values.length;
      }
      await this.audit('library.barcodes_allocated', batch.id, { quantity, message: `${quantity} permanent library barcodes reserved.` });
      return { ...batch, pages: Math.ceil(quantity / 96) };
    });
  }

  async importBarcodes(input: Input) {
    const { tenant, actor } = this.scope();
    const codes = this.codes(input.barcodes);
    return this.command('barcode.import', input, async () => {
      const batch = await this.one(`INSERT INTO library_barcode_batches(tenant_id,quantity,source,created_by)
        VALUES($1,$2,'external',$3::uuid) RETURNING *`, [tenant,codes.length,actor]);
      const inserted = await this.rows(`INSERT INTO library_barcode_registry(barcode,tenant_id,batch_id,ordinal,created_by,encoding_version)
        SELECT value,$1,$2::uuid,ordinality::int,$3::uuid,'external-v1' FROM unnest($4::text[]) WITH ORDINALITY AS codes(value,ordinality)
        ON CONFLICT(barcode) DO NOTHING RETURNING barcode`, [tenant,batch.id,actor,codes]);
      const found = new Set(inserted.map(r => r.barcode));
      const conflicts = codes.filter(code => !found.has(code));
      if (conflicts.length) throw new ConflictException({ message: `Some barcodes are already reserved: ${conflicts.slice(0,10).join(', ')}${conflicts.length>10?` (and ${conflicts.length-10} more)`:''}. Nothing was imported.`, barcodes: conflicts });
      await this.audit('library.barcodes_imported',batch.id,{ quantity: codes.length });
      return batch;
    });
  }
  private codes(value: unknown): string[] {
    if (!Array.isArray(value) || !value.length || value.length > 10000) throw new BadRequestException('Provide 1 to 10,000 barcodes.');
    const codes = value.map(assertBarcode);
    if (new Set(codes).size !== codes.length) throw new BadRequestException('Remove duplicate barcodes from this request.');
    return codes;
  }
  async batches(q: Input) {
    const { tenant } = this.scope(); const { limit, offset } = page(q);
    return this.rows(`SELECT b.*,ceil(b.quantity/96.0)::int AS pages FROM library_barcode_batches b
      WHERE tenant_id=$1 ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3`, [tenant,limit,offset]);
  }
  async barcodes(q: Input) {
    const { tenant } = this.scope(); const { limit, offset } = page(q);
    return this.rows(`SELECT r.*,i.title,c.status FROM library_barcode_registry r
      LEFT JOIN library_copies c ON c.tenant_id=r.tenant_id AND c.id=r.copy_id
      LEFT JOIN library_catalog_items i ON i.tenant_id=c.tenant_id AND i.id=c.catalog_item_id
      WHERE r.tenant_id=$1 AND ($2='' OR ($7::boolean AND r.barcode=$2) OR (NOT $7::boolean AND r.barcode LIKE $2||'%'))
        AND ($3='' OR r.batch_id::text=$3)
        AND ($4='' OR ($4='unused' AND r.copy_id IS NULL) OR ($4='assigned' AND r.copy_id IS NOT NULL))
      ORDER BY r.created_at DESC,r.barcode LIMIT $5 OFFSET $6`,
    [tenant,String(q.search ?? ''),String(q.batch_id ?? ''),String(q.status ?? ''),limit,offset,q.exact==='true']);
  }
  async *printBarcodes(q: Input): AsyncGenerator<string> {
    const { tenant } = this.scope();
    const selected = q.barcodes ? this.codes(q.barcodes) : null;
    if (!selected) await this.one(`SELECT id FROM library_barcode_batches WHERE tenant_id=$1 AND id=$2::uuid`, [tenant,uuid(q.batch_id,'Batch')]);
    let offset = 0, found = 0;
    while (true) {
      const rows = await this.rows(`SELECT barcode FROM library_barcode_registry WHERE tenant_id=$1
        AND (($2::text[] IS NOT NULL AND barcode=ANY($2::text[])) OR ($2::text[] IS NULL AND batch_id=$3::uuid))
        ORDER BY ordinal,barcode LIMIT 500 OFFSET $4`, [tenant,selected,q.batch_id ?? null,offset]);
      for (const row of rows) { found++; yield row.barcode; }
      if (rows.length < 500) break;
      offset += rows.length;
    }
    if (selected && found !== selected.length) throw new NotFoundException('One or more selected barcodes are not owned by this school.');
  }
  async validatePrint(q: Input) {
    let count = 0;
    for await (const barcode of this.printBarcodes(q)) { barcodePrintMetrics(barcode); count++; }
    if (!count) throw new BadRequestException('There are no labels to print.');
    return count;
  }
  async recordPrint(q: Input,count:number) {
    const {tenant,actor}=this.scope();
    return this.db.executeWithTenant(tenant,actor,()=>this.audit('document.generated',String(q.batch_id ?? randomUUID()),{count,document_type:'library_barcode_sheet'}));
  }

  async catalogue(q: Input) {
    const { tenant } = this.scope(); const { limit, offset } = page(q);
    return this.rows(`SELECT i.*,count(c.id)::int AS total_copies,count(c.id) FILTER(WHERE c.status='available')::int AS available_copies,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('id',s.id,'name',s.name)) FROM library_catalog_subjects l JOIN library_subjects s ON s.tenant_id=l.tenant_id AND s.id=l.subject_id WHERE l.tenant_id=i.tenant_id AND l.catalog_item_id=i.id),'[]') AS subjects,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('id',l.class_id,'name',l.class_name)) FROM library_catalog_classes l WHERE l.tenant_id=i.tenant_id AND l.catalog_item_id=i.id),'[]') AS classes
      FROM library_catalog_items i LEFT JOIN library_copies c ON c.tenant_id=i.tenant_id AND c.catalog_item_id=i.id
      WHERE i.tenant_id=$1 AND ($2='' OR i.title ILIKE '%'||$2||'%' OR i.isbn=$2 OR i.author ILIKE '%'||$2||'%')
      AND ($5='' OR EXISTS(SELECT 1 FROM library_catalog_subjects l WHERE l.tenant_id=i.tenant_id AND l.catalog_item_id=i.id AND l.subject_id::text=$5))
      AND ($6='' OR EXISTS(SELECT 1 FROM library_catalog_classes l WHERE l.tenant_id=i.tenant_id AND l.catalog_item_id=i.id AND l.class_id=$6))
      AND ($7::uuid IS NULL OR i.id=$7::uuid)
      GROUP BY i.id ORDER BY i.title,i.id LIMIT $3 OFFSET $4`, [tenant,String(q.search ?? ''),limit,offset,String(q.subject_id??''),String(q.class_id??''),q.id?uuid(q.id,'Book title'):null]);
  }
  async classifications() {
    const {tenant}=this.scope();
    const subjects=await this.rows(`SELECT id::text,name,'library' AS source FROM library_subjects WHERE tenant_id=$1
      UNION ALL SELECT 'academic:'||s.id::text,s.name,'academic' FROM subjects s WHERE s.tenant_id=$1 AND lower(s.status)='active'
      AND NOT EXISTS(SELECT 1 FROM library_subjects l WHERE l.tenant_id=$1 AND lower(l.name)=lower(s.name)) ORDER BY name`,[tenant]);
    const classes=await this.rows(`SELECT c.id::text,c.name,c.grade_level,c.stream,c.is_active FROM class_sections c WHERE c.tenant_id=$1
      AND ((c.is_active=true AND lower(c.status)='active') OR EXISTS(SELECT 1 FROM library_catalog_classes l WHERE l.tenant_id=$1 AND l.class_id=c.id::text)) ORDER BY c.grade_level,c.name`,[tenant]);
    return {subjects,classes};
  }
  async createSubject(input: Input) {
    const {tenant,actor}=this.scope();const name=text(input.name,'Subject',120).replace(/\s+/g,' ');
    return this.command('subject.create',input,async()=>{
      const row=await this.one(`INSERT INTO library_subjects(tenant_id,name,created_by) VALUES($1,$2,$3::uuid)
        ON CONFLICT(tenant_id,lower(name)) DO UPDATE SET name=library_subjects.name RETURNING *`,[tenant,name,actor]);
      await this.audit('library.subject_saved',row.id,{name});return row;
    });
  }
  private selectedIds(value:unknown,field:string):string[] {
    if(value===undefined)return [];
    if(!Array.isArray(value)||value.length>100)throw new BadRequestException(`Choose up to 100 ${field}.`);
    return [...new Set(value.map(v=>text(v,field,200)))];
  }
  private async classifyTitle(id:string,input:Input) {
    const {tenant,actor}=this.scope();
    if(input.subject_ids!==undefined){
      const ids=this.selectedIds(input.subject_ids,'subjects');const resolved:string[]=[];
      for(const value of ids){
        if(value.startsWith('academic:')){
          const academic=await this.one(`SELECT id::text,name FROM subjects WHERE tenant_id=$1 AND id::text=$2 AND lower(status)='active'`,[tenant,value.slice(9)]);
          const subject=await this.one(`INSERT INTO library_subjects(tenant_id,name,academic_subject_id,created_by) VALUES($1,$2,$3,$4::uuid)
            ON CONFLICT(tenant_id,lower(name)) DO UPDATE SET name=library_subjects.name RETURNING id`,[tenant,academic.name,academic.id,actor]);
          resolved.push(subject.id);
        }else resolved.push((await this.one(`SELECT id FROM library_subjects WHERE tenant_id=$1 AND id=$2::uuid`,[tenant,uuid(value,'Subject')])).id);
      }
      await this.rows(`DELETE FROM library_catalog_subjects WHERE tenant_id=$1 AND catalog_item_id=$2::uuid RETURNING subject_id`,[tenant,id]);
      for(const subject of new Set(resolved))await this.rows(`INSERT INTO library_catalog_subjects VALUES($1,$2::uuid,$3::uuid) RETURNING subject_id`,[tenant,id,subject]);
    }
    if(input.class_ids!==undefined){
      const classes=[];for(const value of this.selectedIds(input.class_ids,'classes'))classes.push(await this.one(`SELECT id::text,name FROM class_sections WHERE tenant_id=$1 AND id::text=$2`,[tenant,value]));
      await this.rows(`DELETE FROM library_catalog_classes WHERE tenant_id=$1 AND catalog_item_id=$2::uuid RETURNING class_id`,[tenant,id]);
      for(const c of classes)await this.rows(`INSERT INTO library_catalog_classes VALUES($1,$2::uuid,$3,$4) RETURNING class_id`,[tenant,id,c.id,c.name]);
    }
  }
  private async saveTitle(input:Input,edit=false):Promise<Input> {
    const {tenant}=this.scope();
    if(input.catalog_item_id&&!edit)return this.one(`SELECT * FROM library_catalog_items WHERE tenant_id=$1 AND id=$2::uuid`,[tenant,uuid(input.catalog_item_id,'Book title')]);
    const title=text(input.title,'Title').replace(/\s+/g,' ');
    const details=['author','isbn','category','publisher','edition','language'].map(key=>input[key]?text(input[key],key).replace(/\s+/g,' '):null);
    const [author,isbn,category,publisher,edition,language]=details;
    const signature=JSON.stringify([tenant,title,author??'',isbn??'',publisher??'',edition??''].map(v=>v.toLowerCase()));
    await this.rows(`SELECT pg_advisory_xact_lock(hashtextextended($1,0))::text`,[`library-title:${signature}`]);
    const same=(await this.rows(`SELECT * FROM library_catalog_items WHERE tenant_id=$1 AND lower(title)=lower($2)
      AND lower(COALESCE(author,''))=lower($3) AND lower(COALESCE(isbn,''))=lower($4)
      AND lower(COALESCE(publisher,''))=lower($5) AND lower(COALESCE(edition,''))=lower($6) ORDER BY created_at,id LIMIT 1`,[tenant,title,author??'',isbn??'',publisher??'',edition??'']))[0];
    if(same){
      if(edit&&same.id!==input.catalog_item_id)throw new ConflictException('This title and edition already exist. Select the existing catalogue entry.');
      if(!edit)return {...same,reused_title:true};
    }
    const item=edit?await this.one(`UPDATE library_catalog_items SET title=$3,author=$4,isbn=$5,category=$6,publisher=$7,edition=$8,language=$9,updated_at=now() WHERE tenant_id=$1 AND id=$2::uuid RETURNING *`,[tenant,uuid(input.catalog_item_id,'Book title'),title,...details])
      :await this.one(`INSERT INTO library_catalog_items(tenant_id,title,author,isbn,category,publisher,edition,language) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[tenant,title,author,isbn,category,publisher,edition,language]);
    await this.classifyTitle(item.id,input);return item;
  }
  async updateTitle(input:Input) {
    return this.command('title.update',input,async()=>{const item=await this.saveTitle(input,true);await this.audit('library.catalogue_updated',item.id,{title:item.title});return (await this.catalogue({id:item.id}))[0];});
  }
  private copyDetails(input:Input) {
    const condition=String(input.condition??'good');
    if(!['good','fair','damaged'].includes(condition))throw new BadRequestException('Choose good, fair or damaged condition.');
    if(input.lendable!==undefined&&typeof input.lendable!=='boolean')throw new BadRequestException('Choose whether this copy can be borrowed.');
    const acquisition:Input={};
    for(const key of ['source','acquired_on','price','notes'])if(input.acquisition?.[key]!==undefined&&input.acquisition[key]!=='')acquisition[key]=text(String(input.acquisition[key]),key,500);
    if(acquisition.acquired_on&&(!DATE.test(acquisition.acquired_on)||Number.isNaN(Date.parse(acquisition.acquired_on))||new Date(acquisition.acquired_on).toISOString().slice(0,10)!==acquisition.acquired_on))throw new BadRequestException('Use a valid acquisition date.');
    if(acquisition.price&&!/^\d+(\.\d{1,2})?$/.test(acquisition.price))throw new BadRequestException('Price must be a positive amount with up to two decimal places.');
    return {condition,lendable:input.lendable??true,acquisition};
  }
  private async registerCopy(barcode:string,item:Input,input:Input) {
    const {tenant}=this.scope();const {condition,lendable,acquisition}=this.copyDetails(input);
    const reserved=await this.one(`SELECT * FROM library_barcode_registry WHERE tenant_id=$1 AND barcode=$2 FOR UPDATE`,[tenant,barcode]);
    if(reserved.copy_id||reserved.retired_at)throw new ConflictException(`Barcode ${barcode} is already assigned or retired. No copies were registered.`);
    const copy=await this.one(`INSERT INTO library_copies(tenant_id,catalog_item_id,barcode,accession_number,condition,status,shelf_location,lendable,acquisition)
      VALUES($1,$2::uuid,$3,$4,$5,$6,$7,$8,$9::jsonb) RETURNING *`,[tenant,item.id,barcode,input.accession_number?text(input.accession_number,'Accession number'):barcode,condition,condition==='damaged'?'damaged':'available',input.shelf_location?text(input.shelf_location,'Shelf'):null,lendable,JSON.stringify(acquisition)]);
    await this.audit('library.copy_registered',copy.id,{barcode,catalog_item_id:item.id});return {...copy,title:item.title,reused_title:!!item.reused_title};
  }
  async register(input: Input): Promise<Input> {
    const barcode = assertBarcode(input.barcode);
    return this.command('copy.register',input,async()=>{
      const item=await this.saveTitle(input),copy=await this.registerCopy(barcode,item,input);
      return input.catalog_item_id?copy:{...copy,catalogue:(await this.catalogue({id:item.id}))[0]};
    });
  }
  async registrationRange(input:Input) {
    const {tenant}=this.scope();const batch=uuid(input.batch_id,'Barcode batch');
    const start=Number(input.start),end=Number(input.end);
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<1||end<start||end-start>=1000)throw new BadRequestException('Choose 1 to 1,000 label positions from one batch.');
    // Position is the printed order, not the numeric barcode value: imported
    // identifiers and skipped global collisions remain compatible.
    const codes=await this.rows(`SELECT * FROM library_barcode_registry WHERE tenant_id=$1 AND batch_id=$2::uuid ORDER BY ordinal LIMIT $3 OFFSET $4`,[tenant,batch,end-start+1,start-1]);
    if(codes.length!==end-start+1)throw new BadRequestException('This range extends beyond the selected batch.');
    if(codes.some(c=>c.copy_id||c.retired_at))throw new ConflictException('The range contains assigned or retired stickers. Choose unused labels.');
    return {barcodes:codes.map(c=>c.barcode),count:codes.length};
  }
  async registerBatch(input:Input) {
    if(!input.catalog_item_id)throw new BadRequestException('Select an existing book title for the entire batch.');
    return this.command('copy.register_batch',input,async()=>{
      const range=await this.registrationRange(input),item=await this.saveTitle(input);
      const {tenant}=this.scope(),details=this.copyDetails(input);
      const reserved=await this.rows(`SELECT * FROM library_barcode_registry WHERE tenant_id=$1 AND barcode=ANY($2::text[]) ORDER BY barcode FOR UPDATE`,[tenant,range.barcodes]);
      if(reserved.length!==range.count||reserved.some(r=>r.copy_id||r.retired_at))throw new ConflictException('A label in the range was assigned by another librarian. No copies were registered.');
      const copies=await this.rows(`INSERT INTO library_copies(tenant_id,catalog_item_id,barcode,accession_number,condition,status,shelf_location,lendable,acquisition)
        SELECT $1,$2::uuid,code,code,$3,$4,$5,$6,$7::jsonb FROM unnest($8::text[]) AS code RETURNING id,barcode`,
        [tenant,item.id,details.condition,details.condition==='damaged'?'damaged':'available',input.shelf_location?text(input.shelf_location,'Shelf'):null,details.lendable,JSON.stringify(details.acquisition),range.barcodes]);
      await this.audit('library.copies_registered',item.id,{catalog_item_id:item.id,copies,batch_id:input.batch_id,message:`${copies.length} copies of ${item.title} registered.`});
      return {count:copies.length,catalog_item_id:item.id};
    });
  }
  async scan(code: unknown):Promise<Input> {
    const { tenant } = this.scope(); const barcode = assertBarcode(code);
    const copy = await this.one(`SELECT c.*,i.title,i.author,i.isbn FROM library_copies c
      JOIN library_catalog_items i ON i.tenant_id=c.tenant_id AND i.id=c.catalog_item_id
      WHERE c.tenant_id=$1 AND c.barcode=$2`,[tenant,barcode]);
    const loan = (await this.rows(`${loanSelect} WHERE l.tenant_id=$1 AND l.copy_id=$2::uuid AND l.returned_at IS NULL`,[tenant,copy.id]))[0] ?? null;
    const incidents = await this.rows(`SELECT * FROM library_copy_incidents WHERE tenant_id=$1 AND copy_id=$2::uuid ORDER BY created_at DESC LIMIT 50`,[tenant,copy.id]);
    return { ...copy, loan, incidents };
  }

  async borrowers(q: Input) {
    const { tenant } = this.scope(); const {limit,offset} = page(q);
    return this.rows(`SELECT * FROM (
      SELECT s.id::text AS subject_id,'student'::text AS borrower_type,concat_ws(' ',s.first_name,s.last_name) AS name,
        s.admission_number AS identifier,COALESCE(a.class_name,'') AS class_name,COALESCE(a.stream_name,'') AS stream_name
      FROM students s LEFT JOIN LATERAL(SELECT class_name,stream_name FROM student_allocations
        WHERE tenant_id=s.tenant_id AND student_id::text=s.id::text AND is_current=true LIMIT 1) a ON true
      WHERE s.tenant_id=$1 AND ($6::boolean OR (s.deleted_at IS NULL
        AND lower(s.status::text) NOT IN ('archived','transferred','graduated','suspended','exited')))
      UNION ALL SELECT sp.id::text,'staff',sp.display_name,sp.staff_number,'','' FROM staff_profiles sp
      WHERE sp.tenant_id=$1 AND ($6::boolean OR lower(COALESCE(sp.status,'active')) NOT IN ('archived','suspended','exited','transferred'))
      ) people WHERE ($2='' OR name ILIKE '%'||$2||'%' OR identifier ILIKE '%'||$2||'%' OR class_name ILIKE '%'||$2||'%')
      AND ($3='' OR borrower_type=$3) ORDER BY name,subject_id LIMIT $4 OFFSET $5`,
    [tenant,String(q.search ?? ''),String(q.type ?? ''),limit,offset,q.include_inactive==='true']);
  }
  private async resolveBorrower(type: string, subject: string) {
    const { tenant } = this.scope();
    if (!['student','staff'].includes(type)) throw new BadRequestException('Choose a student or staff borrower.');
    uuid(subject,'Borrower');
    // Lock the authoritative subject, including all legacy duplicate borrower references.
    await this.rows(`SELECT pg_advisory_xact_lock(hashtextextended($1,0))::text`,[`library-borrower:${tenant}:${type}:${subject}`]);
    const person = type === 'student'
      ? await this.one(`SELECT id,admission_number AS identifier,status FROM students WHERE tenant_id=$1 AND id::text=$2 AND deleted_at IS NULL`,[tenant,subject])
      : await this.one(`SELECT id,staff_number AS identifier,status FROM staff_profiles WHERE tenant_id=$1 AND id::text=$2`,[tenant,subject]);
    if (['archived','suspended','exited','transferred','graduated','invited','pending_setup'].includes(String(person.status).toLowerCase())) throw new BadRequestException('This borrower is not active.');
    let b = (await this.rows(`SELECT * FROM library_borrowers WHERE tenant_id=$1 AND borrower_type=$2 AND subject_id=$3::uuid ORDER BY created_at,id LIMIT 1 FOR UPDATE`,[tenant,type,subject]))[0];
    if (!b) b = await this.one(`INSERT INTO library_borrowers(tenant_id,borrower_type,subject_id,scan_code) VALUES($1,$2,$3::uuid,$4) RETURNING *`,[tenant,type,subject,person.identifier]);
    return b;
  }
  async history(q: Input) {
    const {tenant} = this.scope(); const {limit,offset} = page(q);
    const subject = uuid(q.subject_id,'Borrower'); const type = String(q.borrower_type);
    if (!['student','staff'].includes(type)) throw new BadRequestException('Choose a student or staff borrower.');
    const person = type === 'student'
      ? await this.one(`SELECT id,concat_ws(' ',first_name,last_name) AS name,admission_number AS identifier FROM students WHERE tenant_id=$1 AND id::text=$2`,[tenant,subject])
      : await this.one(`SELECT id,display_name AS name,staff_number AS identifier FROM staff_profiles WHERE tenant_id=$1 AND id::text=$2`,[tenant,subject]);
    const counts = await this.one(`SELECT count(*) FILTER(WHERE l.returned_at IS NULL)::int AS outstanding,
      count(*) FILTER(WHERE l.returned_at IS NULL AND l.due_on<(now() AT TIME ZONE 'Africa/Nairobi')::date)::int AS overdue,
      count(*)::int AS total FROM library_copy_loans l JOIN library_borrowers b ON b.tenant_id=l.tenant_id AND b.id=l.borrower_id
      WHERE l.tenant_id=$1 AND b.subject_id=$2::uuid AND b.borrower_type=$3`,[tenant,subject,type]);
    const policy = (await this.rows(`SELECT min(max_active_loans)::int AS max_active_loans FROM library_borrower_limits WHERE tenant_id=$1 AND borrower_type=$2`,[tenant,type]))[0];
    const loans = await this.rows(`${loanSelect} WHERE l.tenant_id=$1 AND b.subject_id=$2::uuid AND b.borrower_type=$3
      AND ($4='' OR ($4='active' AND l.returned_at IS NULL) OR ($4='returned' AND l.returned_at IS NOT NULL)
        OR ($4='overdue' AND l.returned_at IS NULL AND l.due_on<(now() AT TIME ZONE 'Africa/Nairobi')::date))
      ORDER BY l.issued_at DESC,l.id DESC LIMIT $5 OFFSET $6`,[tenant,subject,type,String(q.status ?? ''),limit,offset]);
    return { person, outstanding:Number(counts.outstanding),overdue:Number(counts.overdue),total:Number(counts.total),
      max_active_loans:policy?.max_active_loans ?? null,loans };
  }
  async issue(input: Input) {
    const {tenant,actor} = this.scope();
    const barcodes = this.codes(input.barcodes);
    const due = text(input.due_on,'Due date');
    if (!DATE.test(due) || Number.isNaN(Date.parse(due)) || new Date(due).toISOString().slice(0,10)!==due) throw new BadRequestException('Choose a valid due date.');
    return this.command('loan.issue',input,async () => {
      if(due<today())throw new BadRequestException('Due date must be today or later.');
      const borrower = await this.resolveBorrower(input.borrower_type,input.subject_id);
      if (borrower.restrictions?.blocked || borrower.restrictions?.borrowing_blocked) throw new BadRequestException('Borrowing is restricted for this person.');
      const usage = await this.one(`SELECT count(*)::int AS total FROM library_copy_loans l JOIN library_borrowers b ON b.tenant_id=l.tenant_id AND b.id=l.borrower_id
        WHERE l.tenant_id=$1 AND b.subject_id=$2::uuid AND b.borrower_type=$3 AND l.returned_at IS NULL`,[tenant,borrower.subject_id,borrower.borrower_type]);
      const policy = (await this.rows(`SELECT min(max_active_loans)::int AS maximum FROM library_borrower_limits WHERE tenant_id=$1 AND borrower_type=$2`,[tenant,borrower.borrower_type]))[0];
      if (policy?.maximum != null && usage.total+barcodes.length>policy.maximum) throw new BadRequestException(`Borrowing limit is ${policy.maximum}; this borrower currently holds ${usage.total} books.`);
      const copies = await this.rows(`SELECT * FROM library_copies WHERE tenant_id=$1 AND barcode=ANY($2::text[]) ORDER BY id FOR UPDATE`,[tenant,barcodes]);
      for (const barcode of barcodes) {
        const c = copies.find(c=>c.barcode===barcode);
        if (!c || c.status !== 'available' || !c.lendable) throw new ConflictException(`Book ${barcode} is not available for borrowing in this school. No books were issued.`);
      }
      const loans: Input[] = [];
      for (const c of copies) {
        const ledger = await this.one(`INSERT INTO library_circulation_ledger(tenant_id,copy_id,borrower_id,action,metadata)
          VALUES($1,$2::uuid,$3::uuid,'issue',$4::jsonb) RETURNING *`,[tenant,c.id,borrower.id,
          JSON.stringify({ due_on:due,issued_by_user_id:actor,transaction_id:input.request_id,barcode:c.barcode })]);
        await this.rows(`UPDATE library_copies SET status='issued',updated_at=now() WHERE tenant_id=$1 AND id=$2::uuid RETURNING id`,[tenant,c.id]);
        loans.push({id:ledger.id,copy_id:c.id,barcode:c.barcode,borrower_id:borrower.id,due_on:due,issued_at:ledger.created_at});
        await this.audit('library.book_issued',ledger.id,{barcode:c.barcode,message:`Book ${c.barcode} issued; due ${due}.`},borrower.id);
      }
      return { transaction_id:input.request_id,loans };
    });
  }
  async policies() {
    const {tenant}=this.scope();return this.rows(`SELECT borrower_type,min(max_active_loans)::int AS max_active_loans,min(max_renewals)::int AS max_renewals FROM library_borrower_limits WHERE tenant_id=$1 GROUP BY borrower_type`,[tenant]);
  }
  async savePolicy(input:Input) {
    const {tenant}=this.scope();const type=String(input.borrower_type);
    if(!['student','staff'].includes(type)||!Number.isSafeInteger(input.max_active_loans)||input.max_active_loans<1||input.max_active_loans>2147483647||!Number.isSafeInteger(input.max_renewals)||input.max_renewals<0||input.max_renewals>2147483647)throw new BadRequestException('Set a positive borrowing limit and zero or more renewals, within the supported whole-number range, for students or staff.');
    return this.command('policy.update',input,async()=>{
      await this.rows(`SELECT pg_advisory_xact_lock(hashtextextended($1,0))::text`,[`library-policy:${tenant}:${type}`]);
      const updated=await this.rows(`UPDATE library_borrower_limits SET max_active_loans=$3,max_renewals=$4 WHERE tenant_id=$1 AND borrower_type=$2 RETURNING id`,[tenant,type,input.max_active_loans,input.max_renewals]);
      if(!updated.length)await this.rows(`INSERT INTO library_borrower_limits(tenant_id,borrower_type,max_active_loans,max_renewals) VALUES($1,$2,$3,$4) RETURNING id`,[tenant,type,input.max_active_loans,input.max_renewals]);
      await this.audit('library.policy_updated',type,{max_active_loans:input.max_active_loans,max_renewals:input.max_renewals});return {saved:true};
    });
  }
  async renew(input:Input) {
    const {tenant,actor}=this.scope();const id=uuid(input.loan_id,'Loan');const due=text(input.due_on,'Due date',10);
    if(!DATE.test(due)||Number.isNaN(Date.parse(due))||new Date(due).toISOString().slice(0,10)!==due||due<today())throw new BadRequestException('Choose a valid future due date.');
    return this.command('loan.renew',input,async()=>{
      const found=await this.one(`SELECT copy_id FROM library_copy_loans WHERE tenant_id=$1 AND id=$2::uuid`,[tenant,id]);
      // Use the same copy-then-loan lock order as returns.
      const copy=await this.one(`SELECT * FROM library_copies WHERE tenant_id=$1 AND id=$2::uuid FOR UPDATE`,[tenant,found.copy_id]);
      const loan=await this.one(`SELECT * FROM library_copy_loans WHERE tenant_id=$1 AND id=$2::uuid FOR UPDATE`,[tenant,id]);
      if(loan.returned_at||copy.status!=='issued'||!copy.lendable)throw new ConflictException('Only an active loan of a borrowable copy can be renewed.');
      const previous=loan.due_on instanceof Date?loan.due_on.toISOString().slice(0,10):String(loan.due_on??'').slice(0,10);
      if(previous&&due<=previous)throw new BadRequestException('The new due date must be later than the current due date.');
      const borrower=await this.one(`SELECT * FROM library_borrowers WHERE tenant_id=$1 AND id=$2::uuid`,[tenant,loan.borrower_id]);
      const active=borrower.borrower_type==='student'
        ?await this.one(`SELECT status FROM students WHERE tenant_id=$1 AND id::text=$2 AND deleted_at IS NULL`,[tenant,String(borrower.subject_id)])
        :await this.one(`SELECT status FROM staff_profiles WHERE tenant_id=$1 AND id::text=$2`,[tenant,String(borrower.subject_id)]);
      if(String(active.status).toLowerCase()!=='active'||borrower.restrictions?.blocked||borrower.restrictions?.borrowing_blocked)throw new BadRequestException('This borrower is no longer eligible for renewals.');
      const policy=await this.one(`SELECT min(max_renewals)::int AS maximum FROM library_borrower_limits WHERE tenant_id=$1 AND borrower_type=$2`,[tenant,borrower.borrower_type]);
      const used=await this.one(`SELECT count(*)::int AS total FROM library_renewals WHERE tenant_id=$1 AND loan_id=$2::uuid`,[tenant,id]);
      if(policy.maximum!=null&&used.total>=policy.maximum)throw new BadRequestException(`This loan has reached the school limit of ${policy.maximum} renewals.`);
      const waiting=await this.rows(`SELECT id FROM library_reservations WHERE tenant_id=$1 AND catalog_item_id=$2::uuid AND status='waiting' AND borrower_id<>$3::uuid LIMIT 1`,[tenant,copy.catalog_item_id,borrower.id]);
      if(waiting.length)throw new ConflictException('Another borrower is waiting for this title. Return the copy instead of renewing it.');
      const renewal=await this.one(`INSERT INTO library_renewals(tenant_id,loan_id,renewed_by_user_id,previous_due_on,due_on,reason) VALUES($1,$2::uuid,$3::uuid,$4::date,$5::date,$6) RETURNING *`,[tenant,id,actor,previous||null,due,input.reason?text(input.reason,'Reason'):null]);
      await this.rows(`INSERT INTO library_circulation_ledger(tenant_id,copy_id,borrower_id,action,metadata) VALUES($1,$2::uuid,$3::uuid,'renew',$4::jsonb) RETURNING id`,[tenant,copy.id,borrower.id,JSON.stringify({loan_id:id,due_on:due,previous_due_on:previous,renewal_id:renewal.id,renewed_by_user_id:actor})]);
      await this.audit('library.book_renewed',id,{due_on:due,previous_due_on:previous,message:`Book ${copy.barcode} renewed until ${due}.`},borrower.id);
      return {loan_id:id,due_on:due,renewal_count:used.total+1};
    });
  }
  async updateCopy(input:Input) {
    const {tenant}=this.scope(),id=uuid(input.copy_id,'Copy'),reason=text(input.reason,'Reason');const details=this.copyDetails(input);
    return this.command('copy.details',input,async()=>{
      const copy=await this.one(`UPDATE library_copies SET shelf_location=$3,lendable=$4,acquisition=$5::jsonb,updated_at=now() WHERE tenant_id=$1 AND id=$2::uuid RETURNING *`,[tenant,id,input.shelf_location?text(input.shelf_location,'Shelf'):null,details.lendable,JSON.stringify(details.acquisition)]);
      await this.audit('library.copy_details_updated',id,{reason,shelf_location:copy.shelf_location,lendable:copy.lendable});return copy;
    });
  }
  async returns(input: Input) {
    const {tenant,actor} = this.scope(); const codes = this.codes(input.barcodes);
    const condition = input.condition ?? 'good';
    if (!['good','fair','damaged','lost'].includes(condition)) throw new BadRequestException('Choose a valid return condition.');
    if (['damaged','lost'].includes(condition)) text(input.reason,'Incident notes');
    return this.command('loan.return',input,async () => {
      const copies = await this.rows(`SELECT * FROM library_copies WHERE tenant_id=$1 AND barcode=ANY($2::text[]) ORDER BY id FOR UPDATE`,[tenant,codes]);
      if (copies.length!==codes.length) throw new NotFoundException('A selected book was not found in this school. No returns were saved.');
      const returns: Input[] = [];
      for (const c of copies) {
        const loan = (await this.rows(`SELECT * FROM library_copy_loans WHERE tenant_id=$1 AND copy_id=$2::uuid AND returned_at IS NULL FOR UPDATE`,[tenant,c.id]))[0];
        if (!loan) throw new ConflictException(`Book ${c.barcode} has no active loan. No returns were saved.`);
        const ledger = await this.one(`INSERT INTO library_circulation_ledger(tenant_id,copy_id,borrower_id,action,metadata)
          VALUES($1,$2::uuid,$3::uuid,'return',$4::jsonb) RETURNING *`,[tenant,c.id,loan.borrower_id,
          JSON.stringify({loan_id:loan.id,condition,returned_by_user_id:actor,transaction_id:input.request_id,notes:input.reason ?? null})]);
        await this.rows(`UPDATE library_copies SET status=$3,condition=$4,updated_at=now() WHERE tenant_id=$1 AND id=$2::uuid RETURNING id`,
          [tenant,c.id,condition==='lost'?'lost':condition==='damaged'?'damaged':'available',condition]);
        if (['damaged','lost'].includes(condition)) await this.rows(`INSERT INTO library_copy_incidents(tenant_id,copy_id,action,reason,actor_user_id)
          VALUES($1,$2::uuid,$3,$4,$5::uuid) RETURNING id`,[tenant,c.id,condition,input.reason,actor]);
        // Only an existing school rule can create an automatic penalty.
        const fine = await this.one(`SELECT COALESCE(max(amount_minor),0)::int AS daily FROM library_fine_rules WHERE tenant_id=$1 AND rule_type='overdue'`,[tenant]);
        const dueDate=loan.due_on instanceof Date?loan.due_on.toISOString().slice(0,10):String(loan.due_on??'').slice(0,10);
        const days = dueDate ? Math.max(0,Math.floor((Date.parse(today())-Date.parse(dueDate))/86400000)) : 0;
        const conditionRule=await this.one(`SELECT COALESCE(max(amount_minor),0)::int AS amount FROM library_fine_rules WHERE tenant_id=$1 AND rule_type=$2`,[tenant,condition]);
        const amount=days*fine.daily+(['lost','damaged'].includes(condition)?conditionRule.amount:0);
        if (amount>0) {
          const f = await this.one(`INSERT INTO library_fines(tenant_id,borrower_id,copy_id,reason,amount_minor)
            VALUES($1,$2::uuid,$3::uuid,$4,$5) RETURNING id`,[tenant,loan.borrower_id,c.id,conditionRule.amount>0?condition:'overdue',amount]);
          await this.audit('library.fine_created',f.id,{amount_minor:amount,loan_id:loan.id},loan.borrower_id);
        }
        returns.push({id:ledger.id,loan_id:loan.id,barcode:c.barcode,returned_at:ledger.created_at,condition});
        await this.audit('library.book_returned',ledger.id,{loan_id:loan.id,barcode:c.barcode,message:`Book ${c.barcode} returned (${condition}).`},loan.borrower_id);
      }
      return {transaction_id:input.request_id,returns};
    });
  }
  async loans(q: Input) {
    const {tenant}=this.scope();const {limit,offset}=page(q);
    return this.rows(`${loanSelect} WHERE l.tenant_id=$1
      AND ($2='' OR i.title ILIKE '%'||$2||'%' OR c.barcode=$2 OR s.admission_number=$2 OR sp.staff_number=$2
        OR concat_ws(' ',s.first_name,s.last_name) ILIKE '%'||$2||'%' OR sp.display_name ILIKE '%'||$2||'%')
      AND ($3='' OR ($3='active' AND l.returned_at IS NULL) OR ($3='returned' AND l.returned_at IS NOT NULL)
        OR ($3='overdue' AND l.returned_at IS NULL AND l.due_on<(now() AT TIME ZONE 'Africa/Nairobi')::date))
      ORDER BY l.issued_at DESC,l.id DESC LIMIT $4 OFFSET $5`,[tenant,String(q.search??''),String(q.status??''),limit,offset]);
  }
  async inventory(q: Input) {
    const {tenant}=this.scope();const {limit,offset}=page(q);
    return this.rows(`SELECT c.*,i.title,i.author FROM library_copies c JOIN library_catalog_items i ON i.tenant_id=c.tenant_id AND i.id=c.catalog_item_id
      WHERE c.tenant_id=$1 AND ($2='' OR c.barcode=$2 OR i.title ILIKE '%'||$2||'%')
      AND ($3='' OR c.status=$3) ORDER BY i.title,c.id LIMIT $4 OFFSET $5`,[tenant,String(q.search??''),String(q.status??''),limit,offset]);
  }
  async summary() {
    const {tenant}=this.scope();
    return this.one(`SELECT count(*)::int AS total_copies,
      count(*) FILTER(WHERE status='available')::int AS available_copies,
      count(*) FILTER(WHERE status='issued')::int AS issued_copies,
      count(*) FILTER(WHERE status='lost')::int AS lost_copies,
      count(*) FILTER(WHERE status='damaged')::int AS damaged_copies,
      count(*) FILTER(WHERE status='retired')::int AS retired_copies,
      (SELECT count(*)::int FROM library_copy_loans WHERE tenant_id=$1 AND returned_at IS NULL AND due_on<(now() AT TIME ZONE 'Africa/Nairobi')::date) AS overdue_loans,
      (SELECT count(*)::int FROM library_barcode_registry WHERE tenant_id=$1 AND copy_id IS NULL AND retired_at IS NULL) AS unused_barcodes,
      (SELECT count(*)::int FROM library_copy_loans l JOIN library_borrowers b ON b.tenant_id=l.tenant_id AND b.id=l.borrower_id WHERE l.tenant_id=$1 AND l.returned_at IS NULL AND b.borrower_type='student') AS student_loans,
      (SELECT count(*)::int FROM library_copy_loans l JOIN library_borrowers b ON b.tenant_id=l.tenant_id AND b.id=l.borrower_id WHERE l.tenant_id=$1 AND l.returned_at IS NULL AND b.borrower_type='staff') AS staff_loans
      FROM library_copies WHERE tenant_id=$1`,[tenant]);
  }
  async incident(input: Input) {
    const {tenant,actor}=this.scope();const id=uuid(input.copy_id,'Copy');const reason=text(input.reason,'Reason');
    const status=String(input.status);
    if (!['lost','damaged','available','retired'].includes(status)) throw new BadRequestException('Choose lost, damaged, repaired/found or retired.');
    return this.command('copy.incident',input,async()=>{
      const copy=await this.one(`SELECT * FROM library_copies WHERE tenant_id=$1 AND id=$2::uuid FOR UPDATE`,[tenant,id]);
      const active=(await this.rows(`SELECT id FROM library_copy_loans WHERE tenant_id=$1 AND copy_id=$2::uuid AND returned_at IS NULL`,[tenant,id]))[0];
      if (active) throw new ConflictException('This copy has an active borrower. Record its return or loss at the return desk first.');
      if(copy.status==='retired') throw new ConflictException('Retired copies and their barcodes cannot be reused.');
      if(input.replacement_copy_id) {
        if(uuid(input.replacement_copy_id,'Replacement copy')===id) throw new BadRequestException('Select a different replacement copy.');
        await this.one(`SELECT id FROM library_copies WHERE tenant_id=$1 AND id=$2::uuid AND status='available'`,[tenant,input.replacement_copy_id]);
      }
      await this.rows(`UPDATE library_copies SET status=$3,condition=CASE WHEN $3='available' THEN 'good' WHEN $3='damaged' THEN 'damaged' ELSE condition END,updated_at=now() WHERE tenant_id=$1 AND id=$2::uuid RETURNING id`,[tenant,id,status]);
      const incident=await this.one(`INSERT INTO library_copy_incidents(tenant_id,copy_id,action,reason,actor_user_id,replacement_copy_id)
        VALUES($1,$2::uuid,$3,$4,$5::uuid,$6::uuid) RETURNING *`,[tenant,id,status,reason,actor,input.replacement_copy_id??null]);
      await this.audit('library.copy_condition_updated',id,{status,reason,replacement_copy_id:input.replacement_copy_id??null});
      return incident;
    });
  }
  async stocktakes(q: Input) {
    const {tenant}=this.scope();const {limit,offset}=page(q);
    return this.rows(`SELECT s.*,(SELECT count(*)::int FROM library_stocktake_items i WHERE i.tenant_id=s.tenant_id AND i.session_id=s.id) AS expected,
      (SELECT count(*)::int FROM library_stocktake_items i WHERE i.tenant_id=s.tenant_id AND i.session_id=s.id AND verified_at IS NOT NULL) AS verified
      FROM library_stocktakes s WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,[tenant,limit,offset]);
  }
  async startStocktake(input: Input) {
    const {tenant,actor}=this.scope();
    return this.command('stocktake.start',input,async()=>{
      const session=await this.one(`INSERT INTO library_stocktakes(tenant_id,name,created_by) VALUES($1,$2,$3::uuid) RETURNING *`,[tenant,text(input.name,'Session name'),actor]);
      await this.rows(`INSERT INTO library_stocktake_items(tenant_id,session_id,copy_id,expected_status,expected_shelf)
        SELECT tenant_id,$2::uuid,id,status,shelf_location FROM library_copies WHERE tenant_id=$1 AND status<>'retired' RETURNING copy_id`,[tenant,session.id]);
      await this.audit('library.stocktake_started',session.id);
      return session;
    });
  }
  async stocktakeScan(id: string,input: Input) {
    const {tenant,actor}=this.scope();uuid(id,'Stocktake');const barcode=assertBarcode(input.barcode);
    return this.db.executeWithTenant(tenant,actor,async()=>{
      const session=await this.one(`SELECT * FROM library_stocktakes WHERE tenant_id=$1 AND id=$2::uuid FOR UPDATE`,[tenant,id]);
      if(session.status!=='open')throw new ConflictException('This stocktake is completed.');
      const prior=(await this.rows(`SELECT * FROM library_stocktake_scans WHERE tenant_id=$1 AND session_id=$2::uuid AND barcode=$3`,[tenant,id,barcode]))[0];
      if(prior)return {...prior,outcome:String(prior.outcome),duplicate:true};
      const copy=(await this.rows(`SELECT c.*,i.expected_status,i.expected_shelf FROM library_copies c LEFT JOIN library_stocktake_items i
        ON i.tenant_id=c.tenant_id AND i.copy_id=c.id AND i.session_id=$2::uuid
        WHERE c.tenant_id=$1 AND c.barcode=$3`,[tenant,id,barcode]))[0];
      const shelf=input.observed_shelf?text(input.observed_shelf,'Current shelf'):null;
      const outcome=!copy?'unknown':!copy.expected_status?'not_in_snapshot':copy.expected_status==='issued'?'issued_but_present':shelf&&copy.expected_shelf&&shelf!==copy.expected_shelf?'misplaced':'verified';
      const scan=await this.one(`INSERT INTO library_stocktake_scans(tenant_id,session_id,barcode,copy_id,outcome,scanned_by,observed_shelf)
        VALUES($1,$2::uuid,$3,$4::uuid,$5,$6::uuid,$7) RETURNING *`,[tenant,id,barcode,copy?.id??null,outcome,actor,shelf]);
      if(copy)await this.rows(`UPDATE library_stocktake_items SET verified_at=now() WHERE tenant_id=$1 AND session_id=$2::uuid AND copy_id=$3::uuid RETURNING copy_id`,[tenant,id,copy.id]);
      await this.audit('library.stocktake_scanned',scan.id,{session_id:id,barcode,outcome});
      return {...scan,outcome,duplicate:false};
    });
  }
  async stocktakeReport(id: string,q: Input = {}) {
    const {tenant}=this.scope();uuid(id,'Stocktake');const {limit,offset}=page(q);
    const session=await this.one(`SELECT * FROM library_stocktakes WHERE tenant_id=$1 AND id=$2::uuid`,[tenant,id]);
    const counts=await this.one(`SELECT count(*)::int AS total,
      count(*) FILTER(WHERE verified_at IS NOT NULL)::int AS verified,
      count(*) FILTER(WHERE expected_status='issued')::int AS issued,
      count(*) FILTER(WHERE expected_status IN ('available','reserved','damaged') AND verified_at IS NULL)::int AS missing
      FROM library_stocktake_items WHERE tenant_id=$1 AND session_id=$2::uuid`,[tenant,id]);
    const items=await this.rows(`SELECT c.barcode,c.accession_number,b.title,i.expected_status,i.expected_shelf,c.shelf_location AS current_shelf,c.status AS current_status,i.verified_at
      FROM library_stocktake_items i JOIN library_copies c ON c.tenant_id=i.tenant_id AND c.id=i.copy_id
      JOIN library_catalog_items b ON b.tenant_id=c.tenant_id AND b.id=c.catalog_item_id
      WHERE i.tenant_id=$1 AND i.session_id=$2::uuid ORDER BY b.title,c.id LIMIT $3 OFFSET $4`,[tenant,id,limit,offset]);
    const exceptions=await this.rows(`SELECT barcode,outcome,observed_shelf,created_at FROM library_stocktake_scans WHERE tenant_id=$1 AND session_id=$2::uuid AND outcome<>'verified' ORDER BY created_at DESC LIMIT $3 OFFSET $4`,[tenant,id,limit,offset]);
    return {session,...counts,items,exceptions};
  }
  async completeStocktake(id: string,input: Input) {
    const {tenant}=this.scope();uuid(id,'Stocktake');
    return this.command('stocktake.complete',input,async()=>{
      const session=await this.one(`UPDATE library_stocktakes SET status='completed',completed_at=now() WHERE tenant_id=$1 AND id=$2::uuid AND status='open' RETURNING *`,[tenant,id]);
      await this.audit('library.stocktake_completed',id);
      return session;
    });
  }

  /** Existing API aliases share the same governed physical-copy commands. */
  legacyDepartmentIssue(input: Input) {
    return this.legacyIssue({...input,department:text(input.department,'Department')});
  }
  private async legacyCopy(code: unknown, available = false) {
    const {tenant}=this.scope();const value=text(code,'Book identifier');
    return this.one(`SELECT c.* FROM library_copies c JOIN library_catalog_items i ON i.tenant_id=c.tenant_id AND i.id=c.catalog_item_id
      WHERE c.tenant_id=$1 AND ($3::boolean=false OR c.status='available')
      AND (c.id::text=$2 OR c.barcode=$2 OR c.accession_number=$2 OR c.qr_code=$2 OR i.id::text=$2 OR i.isbn=$2 OR i.title=$2)
      ORDER BY c.created_at,c.id LIMIT 1 FOR UPDATE OF c`,[tenant,value,available]);
  }
  private async ensureBarcode(copy: Input) {
    if(copy.barcode)return copy.barcode as string;
    const {tenant}=this.scope();
    const batch=await this.allocate({quantity:1,request_id:randomUUID()});
    const reserved=await this.one(`SELECT barcode FROM library_barcode_registry WHERE tenant_id=$1 AND batch_id=$2::uuid`,[tenant,batch.id]);
    await this.rows(`UPDATE library_copies SET barcode=$3,updated_at=now() WHERE tenant_id=$1 AND id=$2::uuid RETURNING id`,[tenant,copy.id,reserved.barcode]);
    await this.audit('library.legacy_copy_barcoded',copy.id,{barcode:reserved.barcode});
    return reserved.barcode as string;
  }
  async legacyIssue(input: Input) {
    const {tenant,actor}=this.scope();
    return this.db.executeWithTenant(tenant,actor,async()=>{
      let type=input.borrower_type,subject=input.subject_id;
      if(!subject){
        const code=text(input.borrower_id??input.borrowerId??input.borrower_scan_code??input.student_admission_no??input.borrower_code
          ??input.staff_identifier??input.staff_id??input.staff_number??input.assigned_to,'Borrower identifier');
        const borrower=(await this.rows(`SELECT * FROM library_borrowers WHERE tenant_id=$1 AND (id::text=$2 OR scan_code=$2) ORDER BY created_at LIMIT 1`,[tenant,code]))[0];
        if(borrower){type=borrower.borrower_type;subject=borrower.subject_id;}
        else{
          const student=(await this.rows(`SELECT id FROM students WHERE tenant_id=$1 AND (id::text=$2 OR admission_number=$2) AND deleted_at IS NULL LIMIT 1`,[tenant,code]))[0];
          if(student){type='student';subject=student.id;}
          else{const staff=await this.one(`SELECT id FROM staff_profiles WHERE tenant_id=$1 AND (id::text=$2 OR user_id::text=$2 OR staff_number=$2 OR display_name=$2) LIMIT 1`,[tenant,code]);type='staff';subject=staff.id;}
        }
      }
      const codes=input.barcodes??(Array.isArray(input.books)?input.books.map((b:Input)=>b.barcode):[
        input.copy_id??input.catalog_item_id??input.book_id??input.book_scan_code??input.book_isbn??input.copy_code??input.book_title]);
      if(!Array.isArray(codes)||!codes.length||codes.length>1000)throw new BadRequestException('Select physical books to issue.');
      const barcodes:string[]=[];
      for(const code of codes)barcodes.push(await this.ensureBarcode(await this.legacyCopy(code,true)));
      const result=await this.issue({request_id:input.request_id??input.submission_id??randomUUID(),barcodes,borrower_type:type,subject_id:subject,
        due_on:input.due_on??input.due_date??new Date(Date.now()+14*86400000).toISOString().slice(0,10)});
      if(input.department)await this.audit('library.department_resource.issued',result.loans[0].id,{department:input.department,assigned_to:input.assigned_to,notes:input.notes??null});
      return {...result,...(result.loans.length===1?result.loans[0]:{})};
    });
  }
  async legacyReturn(input: Input) {
    const {tenant,actor}=this.scope();
    return this.db.executeWithTenant(tenant,actor,async()=>{
      let copy:Input;
      if(input.loan_id||input.borrowing_id) {
        const loan=await this.one(`SELECT * FROM library_copy_loans WHERE tenant_id=$1 AND id::text=$2 AND returned_at IS NULL`,[tenant,String(input.loan_id??input.borrowing_id)]);
        copy=await this.legacyCopy(loan.copy_id);
      }else copy=await this.legacyCopy(input.book_scan_code??input.copy_id??input.book_isbn??input.copy_code??input.book_title);
      const barcode=await this.ensureBarcode(copy);
      const result=await this.returns({request_id:input.request_id??input.submission_id??randomUUID(),barcodes:[barcode],
        condition:String(input.condition??'good').toLowerCase(),reason:input.notes??input.reason??'Recorded through the library return desk'});
      return {...result,...result.returns[0]};
    });
  }
  async legacyAdd(input: Input) {
    const count=Number(input.copies_total??input.copies??1);
    if(!Number.isSafeInteger(count)||count<1||count>1000)throw new BadRequestException('Add 1 to 1,000 copies at a time.');
    if(input.barcode&&count!==1)throw new BadRequestException('Each physical copy needs a different barcode. Add one purchased sticker at a time or generate a batch.');
    return this.command('catalogue.add', {...input,request_id:input.request_id??randomUUID()},async()=>{
      const batch=input.barcode
        ?await this.importBarcodes({barcodes:[input.barcode],request_id:randomUUID()})
        :await this.allocate({quantity:count,request_id:randomUUID()});
      const codes:string[]=[];for await(const code of this.printBarcodes({batch_id:batch.id}))codes.push(code);
      let first:Input|undefined;
      for(const code of codes){
        const copy=await this.register({...input,barcode:code,request_id:randomUUID(),...(first?{catalog_item_id:first.catalog_item_id}:{})});
        first??=copy;
      }
      return {...first,id:first!.catalog_item_id,barcode_batch_id:batch.id,copies_total:count};
    });
  }
  async retireTitle(id:string) {
    const {tenant,actor}=this.scope();uuid(id,'Title');
    return this.db.executeWithTenant(tenant,actor,async()=>{
      const title=await this.one(`SELECT * FROM library_catalog_items WHERE tenant_id=$1 AND id=$2::uuid`,[tenant,id]);
      const copies=await this.rows(`SELECT c.* FROM library_copies c WHERE tenant_id=$1 AND catalog_item_id=$2::uuid ORDER BY id FOR UPDATE`,[tenant,id]);
      if(copies.some(c=>c.status==='issued')||(await this.rows(`SELECT l.id FROM library_copy_loans l JOIN library_copies c ON c.tenant_id=l.tenant_id AND c.id=l.copy_id
        WHERE l.tenant_id=$1 AND c.catalog_item_id=$2::uuid AND l.returned_at IS NULL LIMIT 1`,[tenant,id])).length)throw new ConflictException('Return all outstanding copies before retiring this title.');
      await this.rows(`UPDATE library_copies SET status='retired',updated_at=now() WHERE tenant_id=$1 AND catalog_item_id=$2::uuid RETURNING id`,[tenant,id]);
      await this.audit('library.title_retired',id,{copies:copies.length});
      return {...title,status:'retired',message:'Copies retired; catalogue and borrowing history preserved.'};
    });
  }
}
