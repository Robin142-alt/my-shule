import { createHash } from 'node:crypto';
import PDFDocument from 'pdfkit';
import type { ReportArtifact } from '../../../common/reports/report-artifact';
import type { AnalyticsPrintReport } from './analytics-report-contract';

/** A4 tables with measured row heights, repeated headings and numbered pages. */
export async function createAnalyticsReportPdf(report: AnalyticsPrintReport): Promise<ReportArtifact> {
  const content = await new Promise<Buffer>((resolve,reject)=>{
    const doc = new PDFDocument({size:'A4',margin:40,bufferPages:true,info:{Title:report.title,Author:report.generated_by,Subject:report.school_name,CreationDate:new Date(report.generated_at)}});
    const chunks:Buffer[]=[];
    doc.on('data',chunk=>chunks.push(chunk));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);
    const width=doc.page.width-80;
    const bottom=doc.page.height-62;
    // Helvetica supports these text values; normalize control characters and typography.
    const clean=(value:string)=>value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[\u2010-\u2015]/g,'-').replace(/\u00d7/g,'x');
    const text=(value:string,size=10,bold=false)=>{doc.font(bold?'Helvetica-Bold':'Helvetica').fontSize(size).fillColor('#18263b').text(clean(value),{width,lineGap:3});};
    const page=()=>{doc.addPage();text(report.school_name,10,true);text(`${report.title} / ${report.document_number}`,8);doc.moveDown(0.6);};
    const reserve=(height:number)=>{if(doc.y+height>bottom)page();};
    text(report.school_name,19,true);
    if(report.school_motto)text(report.school_motto,9);
    if(report.school_address)text(report.school_address,9);
    doc.moveDown(0.6);text(report.title,23,true);
    text(`${report.exam} / ${report.period}`,11,true);text(`Scope: ${report.scope}`,9);
    text(`Document: ${report.document_number}`,8);
    text(`Generated: ${new Date(report.generated_at).toLocaleString('en-GB',{timeZone:'Africa/Nairobi'})} EAT / By: ${report.generated_by}`,8);
    doc.moveDown(0.5);
    for(const filter of report.filters){reserve(32);text(`${filter.label}: ${filter.value}`,9);}
    doc.moveDown(0.5);
    reserve(66);
    const metricsTop=doc.y;
    report.metrics.forEach((metric,index)=>{
      const x=40+index*width/4;
      doc.font('Helvetica').fontSize(8).fillColor('#526173').text(clean(metric.label),x,metricsTop,{width:width/4-10});
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#18263b').text(clean(metric.value),x,metricsTop+25,{width:width/4-10});
    });
    doc.x=40;doc.y=metricsTop+60;
    for(const section of report.sections){
      reserve(100);doc.moveDown();text(section.title,13,true);
      if(section.note){reserve(60);text(section.note,9);doc.moveDown(0.3);}
      if(!section.rows.length){text('No records in this selection.',9);continue;}
      const count=section.headers.length;
      const weights=count===2?[0.34,0.66]:count===6?[0.29,0.17,0.12,0.12,0.17,0.13]:Array(count).fill(1/count);
      const total=weights.reduce((a,b)=>a+b,0);
      const widths=weights.map(weight=>width*weight/total);
      const row=(cells:string[],heading=false)=>{
        doc.font(heading?'Helvetica-Bold':'Helvetica').fontSize(9);
        const height=Math.max(...cells.map((cell,i)=>doc.heightOfString(clean(cell),{width:widths[i]-12,lineGap:2})))+16;
        if(doc.y+height>bottom){page();if(!heading)row(section.headers,true);}
        const top=doc.y;let x=40;
        if(heading)doc.rect(40,top,width,height).fill('#e9eff6');
        cells.forEach((cell,i)=>{
          doc.font(heading?'Helvetica-Bold':'Helvetica').fontSize(9).fillColor('#18263b').text(clean(cell),x+6,top+8,{width:widths[i]-12,lineGap:2});x+=widths[i];
        });
        doc.moveTo(40,top+height).lineTo(40+width,top+height).strokeColor('#dbe2eb').lineWidth(0.5).stroke();
        doc.x=40;doc.y=top+height;
      };
      row(section.headers,true);section.rows.forEach(cells=>row(cells));
    }
    reserve(100);doc.moveDown();text('How to read this report',11,true);
    for(const note of report.notes){reserve(64);text(note,8);doc.moveDown(0.3);}
    const pages=doc.bufferedPageRange();
    for(let index=pages.start;index<pages.start+pages.count;index++){
      doc.switchToPage(index);doc.font('Helvetica').fontSize(8).fillColor('#526173');
      // The footer sits in the bottom margin; prevent PDFKit from creating a new page for it.
      const margin=doc.page.margins.bottom;doc.page.margins.bottom=0;
      doc.text(`${report.document_number}  |  Internal academic review`,40,doc.page.height-40,{width:width-65,lineBreak:false});
      doc.text(`${index+1} / ${pages.count}`,doc.page.width-95,doc.page.height-40,{width:55,align:'right',lineBreak:false});
      doc.page.margins.bottom=margin;
    }
    doc.end();
  });
  return {filename:`${report.document_number.toLowerCase()}.pdf`,contentType:'application/pdf',content,byteLength:content.length,
    checksumSha256:createHash('sha256').update(content).digest('hex'),generatedAt:report.generated_at,rowCount:report.sections.reduce((count,section)=>count+section.rows.length,0)};
}
