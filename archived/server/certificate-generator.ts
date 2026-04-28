import PDFDocument from 'pdfkit';

export interface CertificateData {
  athleteName: string;
  eventName: string;
  place: number;
  performance: string;
  meetName: string;
  meetDate: string;
  teamName?: string;
}

export function generateCertificatePDF(data: CertificateData) {
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 72, bottom: 72, left: 72, right: 72 }
  });
  
  doc.lineWidth(3);
  doc.rect(50, 50, 512, 692).stroke();
  
  doc.fontSize(36);
  doc.font('Helvetica-Bold');
  doc.text('CERTIFICATE OF ACHIEVEMENT', 72, 120, {
    align: 'center',
    width: 450
  });
  
  doc.fontSize(16);
  doc.font('Helvetica');
  doc.text('This certificate is presented to', 72, 200, {
    align: 'center',
    width: 450
  });
  
  doc.fontSize(28);
  doc.font('Helvetica-Bold');
  doc.text(data.athleteName.toUpperCase(), 72, 240, {
    align: 'center',
    width: 450
  });
  
  if (data.teamName) {
    doc.fontSize(14);
    doc.font('Helvetica-Oblique');
    doc.text(data.teamName, 72, 280, {
      align: 'center',
      width: 450
    });
  }
  
  doc.fontSize(16);
  doc.font('Helvetica');
  
  const placeSuffix = data.place === 1 ? 'st' : data.place === 2 ? 'nd' : data.place === 3 ? 'rd' : 'th';
  const placeText = `${data.place}${placeSuffix} Place`;
  
  doc.text(`for placing ${placeText} in the`, 72, 330, {
    align: 'center',
    width: 450
  });
  
  doc.fontSize(20);
  doc.font('Helvetica-Bold');
  doc.text(data.eventName, 72, 360, {
    align: 'center',
    width: 450
  });
  
  doc.fontSize(16);
  doc.font('Helvetica');
  doc.text(`with a performance of ${data.performance}`, 72, 400, {
    align: 'center',
    width: 450
  });
  
  doc.fontSize(14);
  doc.text(`at the ${data.meetName}`, 72, 450, {
    align: 'center',
    width: 450
  });
  
  doc.text(data.meetDate, 72, 475, {
    align: 'center',
    width: 450
  });
  
  doc.moveTo(150, 580).lineTo(450, 580).stroke();
  doc.fontSize(12);
  doc.text('Meet Director', 150, 590, {
    align: 'center',
    width: 300
  });
  
  doc.fontSize(10);
  doc.text(`Issued: ${new Date().toLocaleDateString()}`, 72, 680, {
    align: 'center',
    width: 450
  });
  
  doc.end();
  
  return doc;
}
