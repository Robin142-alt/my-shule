import assert from 'node:assert/strict';
import test from 'node:test';
import { inflateSync } from 'node:zlib';
import { assertBarcode, barcodePrintMetrics, createBarcodePdf, encodeCode128, LABEL_SHEET, labelPosition, mm } from './barcode-print';

test('A4 geometry is exactly 96 labels, 32 x 15 mm, with specified margins and gaps',()=>{
  assert.equal(LABEL_SHEET.columns*LABEL_SHEET.rows,96);
  assert.equal(6*32+5*1+2*6.5,210);assert.equal(16*15+15*1+2*21,297);
  assert.deepEqual(labelPosition(0),{page:0,column:0,row:0,x:6.5,y:21});
  assert.deepEqual(labelPosition(95),{page:0,column:5,row:15,x:171.5,y:261});
  assert.deepEqual(labelPosition(96),{page:1,column:0,row:0,x:6.5,y:21});
});
test('Code 128 uses Code C for even numeric input, preserves odd numbers and exact external data',()=>{
  // ISO Code C start symbol 105 = 211232. Stop 106 = 2331112.
  const encoded=encodeCode128('000001');
  assert.equal(encoded.slice(0,6).join(''),'211232');
  assert.equal(encoded.slice(-7).join(''),'2331112');
  assert.equal(encoded.reduce((a,b)=>a+b,0),68);
  assert.notDeepEqual(encodeCode128('000001'),encodeCode128('1'));
  assert.notDeepEqual(encodeCode128('ABC'),encodeCode128('abc'));
  for(const value of ['1000000','999999','1000000000','ABC1','A^B','001234'])assert.ok(barcodePrintMetrics(value).quietMm>=2.54);
  assert.equal(assertBarcode('900719925474099312345678901234567890'),'900719925474099312345678901234567890');
  assert.throws(()=>assertBarcode(12345));assert.throws(()=>assertBarcode(' 000001'));assert.throws(()=>assertBarcode('000001\n'));
});
test('unprintable values fail visibly rather than shrinking bars or dropping quiet zones',()=>{
  assert.throws(()=>barcodePrintMetrics('9007199254740993'),/cannot fit/);
  assert.throws(()=>barcodePrintMetrics('THIS-EXTERNAL-BARCODE-IS-TOO-LONG'),/cannot fit/);
});
async function collect(count:number) {
  const values=Array.from({length:count},(_,i)=>String(i+1).padStart(6,'0'));
  const pdf=await createBarcodePdf(values,{guides:true,documentId:'test-only',schoolId:'test-school',actor:'test-librarian'});
  const chunks:Buffer[]=[];for await(const chunk of pdf.stream)chunks.push(Buffer.from(chunk));
  return {pdf,bytes:Buffer.concat(chunks),values};
}
for(const [count,pages] of [[96,1],[1000,11],[4800,50]])test(`${count} exact labels render to ${pages} A4 PDF pages without filling unused positions`,{timeout:120000},async()=>{
  const {pdf,bytes,values}=await collect(count);
  assert.equal(pdf.count,count);assert.equal(pdf.pages,pages);
  const source=bytes.toString('latin1');
  assert.equal((source.match(/\/Type \/Page\b/g)??[]).length,pages);
  const boxes=[...source.matchAll(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/g)];
  assert.equal(boxes.length,pages);
  for(const [,width,height]of boxes){assert.ok(Math.abs(Number(width)-mm(210))<.00001);assert.ok(Math.abs(Number(height)-mm(297))<.00001);}
  const streams=[...source.matchAll(/<<([^<>]*\/Length\s+(\d+)[^<>]*)>>\r?\nstream\r?\n/g)].flatMap(match=>{
    const start=match.index!+match[0].length;
    try{return [inflateSync(bytes.subarray(start,start+Number(match[2]))).toString('latin1')];}catch{return [];}
  });
  // Human-readable identity appears once, in vector page content.
  const printedText=streams.flatMap(stream=>[...stream.matchAll(/\[([^\]]*)\]\s*TJ/g)].map(match=>
    [...match[1].matchAll(/<([a-f0-9]+)>/gi)].map(part=>Buffer.from(part[1],'hex').toString('latin1')).join('')));
  for(const value of [values[0],values.at(-1)!])assert.equal(printedText.filter(text=>text===value).length,1);
  assert.equal(printedText.filter(text=>/^\d{6}$/.test(text)).length,count);
  assert.ok(!source.includes('/Subtype /Image'),'Barcode artwork must be vector paths');
});
