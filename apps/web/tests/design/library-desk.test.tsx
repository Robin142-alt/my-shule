import { borrowerReportHtml, printLibraryReport, type BorrowerReport } from '@/lib/library/borrower-report';
it('renders readable per-copy report rows, escaped school data and no technical identifiers', () => {
  const report:BorrowerReport={type:'outstanding',title:'OUTSTANDING LIBRARY BOOKS',document_number:'LIB-123',generated_at:'2026-10-28T08:00:00Z',generated_by:'Librarian',school:{name:'A&B School',logo_url:null},scope:'Whole school',totals:{copies:3,outstanding:3,students:1,overdue:1},records:Array.from({length:3},(_,i)=>({id:`internal-loan-${i}`,copy_id:`internal-copy-${i}`,borrower_id:'internal-student',book_title:'A very long <title>',barcode:`COPY-${i}`,issue_date:'2026-10-01',due_date:'2026-10-20',status:i===0?'Overdue':'Borrowed',student_name:'Amina',admission_no:'001',class_name:'Grade 9',stream_name:'East',borrower_type:'student'}))};
  const html=borrowerReportHtml(report);expect(html).toContain('A&amp;B School');expect(html).toContain('A very long &lt;title&gt;');expect(html).not.toContain('internal-');expect(html).not.toContain('Robin Project');
  expect(html.match(/<td>COPY-/g)).toHaveLength(3);expect(html).toContain('display:table-header-group');expect(html).toContain('A4 portrait');expect(html).not.toContain('<img');
  const unsafeActor=borrowerReportHtml({...report,generated_by:'</style><script>alert(1)</script>'});
  expect(unsafeActor).not.toContain('</style><script>');expect(unsafeActor).toContain('\\3c /style>');
});
it('prints verified borrower identity and zero totals on an empty individual report', () => {
  const html=borrowerReportHtml({type:'outstanding',title:'OUTSTANDING LIBRARY BOOKS',document_number:'LIB-EMPTY',generated_at:'2026-10-28',generated_by:'Librarian',school:{name:'School',logo_url:null},scope:'Individual borrower',records:[],totals:{copies:0,outstanding:0,students:0,overdue:0},selected_borrower:{borrower_id:'internal-id',student_name:'Amina <Otieno>',admission_no:'ADM001',class_name:'Grade 9',stream_name:'East',borrower_type:'student'}});
  expect(html).toContain('Amina &lt;Otieno&gt;');expect(html).toContain('ADM001');expect(html).toContain('Grade 9');expect(html).toContain('Stream: East');expect(html).toContain('No matching borrowing records');expect(html).not.toContain('internal-id');
});

it('refuses to print a blank frame and prints only a loaded report', async () => {
  const frame=document.createElement('iframe'); document.body.appendChild(frame);
  const view=frame.contentWindow!, doc=frame.contentDocument!;
  const print=jest.fn(); view.print=print; view.focus=jest.fn();
  try {
    await expect(printLibraryReport(frame)).rejects.toThrow('not ready');
    expect(print).not.toHaveBeenCalled();
    doc.body.dataset.libraryReport='true';
    Object.defineProperty(doc,'readyState',{value:'complete',configurable:true});
    await printLibraryReport(frame);
    expect(print).toHaveBeenCalledTimes(1);
  } finally { frame.remove(); }
});
