import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { ModuleAccessService } from '../module-access/module-access.service';
import { COHORT_SCHEMA_SQL } from '../academics/cohort-schema';
import { PROGRESSION_SCHEMA_SQL } from './progression-schema';
import { ProgressionEngine } from './student-progression.service';
import { progressionCalendar } from './progression-destinations';
import { day, localDay } from './progression-policy';
import { query } from './progression-store';

/** The API's existing process owns bounded, resumable work; database leases coordinate replicas. */
@Injectable()
export class StudentProgressionRuntime implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger=new Logger(StudentProgressionRuntime.name);
  private timer?:ReturnType<typeof setInterval>;
  private busy=false;
  private cursor='';
  private stopped=false;
  constructor(private readonly prisma:PrismaService,private readonly engine:ProgressionEngine,
    private readonly context:RequestContextService,private readonly modules:ModuleAccessService) {}

  async onApplicationBootstrap() {
    await this.prisma.runSchemaBootstrap(COHORT_SCHEMA_SQL);
    await this.prisma.runSchemaBootstrap(PROGRESSION_SCHEMA_SQL);
    if(process.env.NODE_ENV==='test'||process.env.STUDENT_PROGRESSION_AUTOMATION_ENABLED==='false'
      ||process.env.APP_RUNTIME?.includes('worker')||process.env.APP_RUNTIME==='serverless') return;
    this.timer=setInterval(()=>void this.tick(),60_000);
    this.timer.unref();
    void this.tick();
  }
  onModuleDestroy() {this.stopped=true;if(this.timer) clearInterval(this.timer);}

  async tick(now=new Date()) {
    if(this.busy||this.stopped) return;
    this.busy=true;
    const seed={request_id:randomUUID(),tenant_id:null,user_id:'',role:'system',session_id:null,
      permissions:['academics:manage-lifecycle'],is_authenticated:true,client_ip:null,user_agent:'MyShule academic progression',
      method:'BACKGROUND',path:'/academics/progression',started_at:now.toISOString()};
    try {
      // Registry discovery uses the established platform role; all school work restores a tenant-scoped system context.
      await this.context.run({...seed,role:'platform_owner'},async()=>{
        // Platform school identifiers are the only cross-school discovery data.
        const schools=await this.prisma.query<{tenant_id:string}>(`SELECT tenant_id FROM tenants
          WHERE tenant_id>$1 AND lower(status) IN ('active','trial','trialing','approved') ORDER BY tenant_id LIMIT 25`,[this.cursor]);
        this.cursor=schools.rows.length===25?schools.rows.at(-1)!.tenant_id:'';
        for(const school of schools.rows) {
          if(this.stopped) break;
          const tenant=school.tenant_id;
          await this.context.run({...seed,request_id:randomUUID(),tenant_id:tenant},async()=>{
            try {
              if(await this.modules.findFirstMissingModule(tenant,['academics'])) return;
              const actor={tenantId:tenant,userId:null,role:'system',permissions:['academics:manage-lifecycle'],system:true};
              await this.engine.synchronizeCalendar(actor,now);
              const years=await this.prisma.executeWithTenant(tenant,null,async tx=>{
                await query(tx,'INSERT INTO academic_progression_activation(tenant_id) VALUES($1) ON CONFLICT DO NOTHING RETURNING tenant_id',tenant);
                const calendar=await progressionCalendar(tx,tenant);
                const today=localDay(now,calendar.timezone);
                return calendar.years.filter(year=>['active','closed'].includes(year.status)&&day(year.ends_on)<today).slice(-3);
              });
              for(const year of years) await this.engine.runYear(actor,year.id,now);
            } catch(error) {
              const message=error instanceof Error?error.message:'Academic progression failed';
              this.logger.error(`Academic progression failed for school ${tenant}: ${message}`);
              await this.prisma.executeWithTenant(tenant,null,tx=>query(tx,`INSERT INTO academic_progression_activation(tenant_id,last_checked_at,last_error)
                VALUES($1,NOW(),$2) ON CONFLICT(tenant_id) DO UPDATE SET last_checked_at=NOW(),last_error=EXCLUDED.last_error RETURNING tenant_id`,tenant,message)).catch(()=>undefined);
            }
          });
        }
      });
    } catch(error) {this.logger.error('Academic progression discovery failed',error instanceof Error?error.stack:undefined);}
    finally {this.busy=false;}
  }
}
