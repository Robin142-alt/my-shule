import { createHash } from 'node:crypto';
import PDFDocument from 'pdfkit';
import type { ReportArtifact } from '../../../common/reports/report-artifact';
import type { AnalyticsPrintReport } from './analytics-report-contract';
import { analyticsReportMethods } from './analytics-report-contract';

/** A4 tables with measured row heights, repeated headings and numbered pages. */
export async function createAnalyticsReportPdf(report: AnalyticsPrintReport): Promise<ReportArtifact> {
  const content = await new Promise<Buffer>((resolve,reject)=>{
    const doc = new PDFDocument({size:'A4',margin:40,bufferPages:true,info:{Title:report.title,Author:report.generated_by,Subject:report.school_name,CreationDate:new Date(report.generated_at)}});
    const chunks:Buffer[]=[];
    doc.on('data',chunk=>chunks.push(chunk));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);
    const render=async()=>{
    const width=doc.page.width-80;
    const bottom=doc.page.height-62;
    // Helvetica supports these text values; normalize control characters and typography.
    const clean=(value:string)=>value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[\u2010-\u2015\u2212]/g,'-').replace(/\u00d7/g,'x').replace(/≥/g,'>=').replace(/≤/g,'<=').replace(/→/g,'to');
    const text=(value:string,size=10,bold=false)=>{doc.font(bold?'Helvetica-Bold':'Helvetica').fontSize(size).fillColor('#18263b').text(clean(value),{width,lineGap:3});};
    const page=()=>{doc.addPage();doc.rect(40,27,width,3).fill('#087e75');text(report.school_name,10,true);text(`${report.title} / ${report.document_number}`,8);doc.moveDown(0.6);};
    const reserve=(height:number)=>{if(doc.y+height>bottom)page();};
    doc.rect(40,27,width,4).fill('#087e75');
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
    if(report.metrics.length) {
    reserve(66);
    const metricsTop=doc.y;
    report.metrics.forEach((metric,index)=>{
      const x=40+index*width/4;
      doc.font('Helvetica').fontSize(8).fillColor('#526173').text(clean(metric.label),x,metricsTop,{width:width/4-10});
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#18263b').text(clean(metric.value),x,metricsTop+25,{width:width/4-10});
    });
    doc.x=40;doc.y=metricsTop+60;
    }
    for(const section of report.sections){
      reserve(section.chart?(section.chart.kind==='bar'?section.chart.points.length*23+115:275):115);doc.moveDown();
      if(report.sections.length>1||section.title!==report.title)text(section.title,14,true);
      if(section.metric){
        const top=doc.y+8;doc.roundedRect(40,top,width,65,8).fill('#edf6f2');
        doc.font('Helvetica-Bold').fontSize(26).fillColor('#155e57').text(clean(section.metric.value),55,top+12,{width:width-30});
        const unitX=55+doc.widthOfString(clean(section.metric.value))+8;
        doc.font('Helvetica').fontSize(10).fillColor('#52796f').text(clean(section.metric.unit),unitX,top+26,{width:Math.max(30,width-unitX+25)});
        doc.x=40;doc.y=top+79;continue;
      }
      if(!section.rows.length){text(section.empty_message??'No results for this selection. Choose another exam or clear a filter.',9);continue;}
      if(section.chart&&section.chart.points.some(p=>p.value!==null)){
        const chart=section.chart,points=chart.points;
        text(chart.label,9,true);
        const top=doc.y+12;
        if(chart.kind==='bar'){
          const max=Math.max(1,...points.map(p=>Math.abs(p.value??0))),negative=points.some(p=>(p.value??0)<0);
          const left=200,plotWidth=width-210,zero=left+(negative?plotWidth/2:0);
          for(let i=0;i<points.length;i++){
            const point=points[i],y=top+i*23;
            doc.font('Helvetica').fontSize(8).fillColor('#365752').text(clean(point.label),40,y,{width:150,height:18,ellipsis:true});
            doc.rect(left,y+3,plotWidth,7).fill('#edf3f0');
            if(negative)doc.moveTo(zero,y).lineTo(zero,y+13).strokeColor('#a1b9b0').lineWidth(.5).stroke();
            if(point.value!==null){const w=Math.abs(point.value)/max*plotWidth*(negative?.5:1);doc.rect(point.value<0?zero-w:zero,y+3,w,7).fill(point.value<0?'#b16953':'#168f80');}
            doc.fillColor('#365752').text(point.value===null?'-':String(point.value),left+plotWidth+8,y,{width:40,align:'right'});
          }
          doc.x=40;doc.y=top+points.length*23+5;
        }else{
          const vals=points.map(p=>p.value).filter((v):v is number=>v!==null),low=Math.min(0,...vals),high=Math.max(1,...vals),height=130;
          const left=72,plotWidth=width-48;
          const x=(i:number)=>left+(points.length===1?plotWidth/2:i/(points.length-1)*plotWidth);
          const y=(v:number)=>top+height-(v-low)/(high-low)*height;
          for(let i=0;i<=4;i++){const value=low+(high-low)*i/4,yy=y(value);doc.moveTo(left,yy).lineTo(left+plotWidth,yy).strokeColor('#e0eae5').lineWidth(.5).stroke();doc.fontSize(8).fillColor('#59756d').text(String(Math.round(value*10)/10),40,yy-4,{width:26,align:'right'});}
          for(let i=0;i<points.length;i++){const point=points[i];if(point.value===null)continue;if(i&&points[i-1].value!==null)doc.moveTo(x(i-1),y(points[i-1].value!)).lineTo(x(i),y(point.value)).strokeColor('#168f80').lineWidth(2).stroke();doc.circle(x(i),y(point.value),2.5).fill('#168f80');}
          doc.fontSize(8).fillColor('#59756d').text(clean(points[0]?.label??''),left,top+height+9,{width:plotWidth/2});doc.text(clean(points.at(-1)?.label??''),left+plotWidth/2,top+height+9,{width:plotWidth/2,align:'right'});
          doc.x=40;doc.y=top+height+40;
        }
        text(`${points.length<chart.total?`Chart shows the first ${points.length} of ${chart.total} results. `:''}All exact values appear below.`,8);doc.moveDown(.5);
      }
      const count=section.headers.length;
      doc.font('Helvetica').fontSize(9);
      // Size columns to their actual labels/evidence, rather than assuming every six-column
      // report has the same numeric/text layout. Long explanations get room to wrap.
      const weights=count===2?[0.34,0.66]:section.headers.map((header,index)=>Math.min(170,Math.max(45,
        ...[header,...section.rows.slice(0,100).map(cells=>cells[index])].map(cell=>doc.widthOfString(clean(cell))))+12));
      const total=weights.reduce((a,b)=>a+b,0);
      const widths=weights.map(weight=>width*weight/total);
      let rowIndex=0;
      const row=(cells:string[],heading=false)=>{
        doc.font(heading?'Helvetica-Bold':'Helvetica').fontSize(9);
        const height=Math.max(...cells.map((cell,i)=>doc.heightOfString(clean(cell),{width:widths[i]-12,lineGap:2})))+16;
        if(doc.y+height>bottom){page();if(!heading)row(section.headers,true);}
        const top=doc.y;let x=40;
        if(heading)doc.rect(40,top,width,height).fill('#e5f0eb');
        else if(rowIndex++%2===0)doc.rect(40,top,width,height).fill('#f8faf9');
        cells.forEach((cell,i)=>{
          doc.font(heading?'Helvetica-Bold':'Helvetica').fontSize(9).fillColor('#18263b').text(clean(cell),x+6,top+8,{width:widths[i]-12,lineGap:2});x+=widths[i];
        });
        doc.moveTo(40,top+height).lineTo(40+width,top+height).strokeColor('#dbe2eb').lineWidth(0.5).stroke();
        doc.x=40;doc.y=top+height;
      };
      row(section.headers,true);
      for(let index=0;index<section.rows.length;index++){
        row(section.rows[index]);
        // Large collections yield between batches so other school requests stay responsive.
        if(index>0&&index%200===0)await new Promise<void>(resume=>setImmediate(resume));
      }
    }
    reserve(100);doc.moveDown();text('Calculation details',13,true);
    for(const section of analyticsReportMethods(report)){doc.font('Helvetica').fontSize(9);const headingHeight=doc.heightOfString(clean(section.title),{width,lineGap:3});doc.fontSize(8);reserve(doc.heightOfString(clean(section.note),{width,lineGap:3})+headingHeight+24);text(section.title,9,true);text(section.note,8);doc.moveDown(.5);}
    reserve(100);text('How to read this report',11,true);
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
    };
    void render().catch(error=>{doc.destroy();reject(error);});
  });
  return {filename:`${report.document_number.toLowerCase()}.pdf`,contentType:'application/pdf',content,byteLength:content.length,
    checksumSha256:createHash('sha256').update(content).digest('hex'),generatedAt:report.generated_at,rowCount:report.sections.reduce((count,section)=>count+section.rows.length,0)};
}
