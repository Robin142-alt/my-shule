import { downloadCsvFile, openPrintDocument } from '@/lib/dashboard/export';
it('downloads spreadsheet-safe references without altering real numeric amounts',()=>{
  const append=jest.spyOn(document.body,'appendChild');
  downloadCsvFile({filename:'finance.csv',headers:['Reference','Amount'],rows:[['=HYPERLINK("https://invalid")','-12500'],['  +CMD','10000'],['Normal receipt','0']]});
  const link=append.mock.calls[0][0] as HTMLAnchorElement;
  const csv=decodeURIComponent(link.href.split(',').slice(1).join(','));
  expect(csv).toContain("'  +CMD,10000");
  expect(csv).toContain("'=HYPERLINK");
  expect(csv).toContain(',-12500');
  expect(csv).toContain('Normal receipt,0');
  append.mockRestore();
});

it('previews one toolbar and downloads a real escaped receipt document', () => {
  openPrintDocument({eyebrow:'Test school',title:'Receipt RCT-001',subtitle:'Cleared cash receipt',rows:[{label:'Learner',value:'<script>unsafe</script>'},{label:'Amount',value:'KES 125.50'}],footer:'Generated from saved school records'});
  const preview=document.querySelector('[data-myshule-print-preview]')!;
  expect(preview.querySelector('iframe')?.contentDocument?.querySelector('.toolbar')).toBeNull();
  const append=jest.spyOn(document.body,'appendChild');
  (preview.querySelector('[data-myshule-download-document]') as HTMLButtonElement).click();
  const link=append.mock.calls[0][0] as HTMLAnchorElement;
  expect(link.download).toBe('Receipt-RCT-001.html');
  const html=decodeURIComponent(link.href.split(',').slice(1).join(','));
  expect(html).toContain('KES 125.50');
  expect(html).toContain('&lt;script&gt;unsafe&lt;/script&gt;');
  expect(html).not.toContain('<script>unsafe</script>');
  expect(html).toContain('Save as PDF');
  append.mockRestore();preview.remove();
});
