import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';

@Injectable({ providedIn: 'root' })
export class PdfService {

  generatePrescription(data: {
    doctorName: string; specialty: string;
    patientName: string; date: string;
    medications: { name: string; dosage: string; frequency: string; duration: string }[];
    instructions?: string;
  }): void {
    const doc = this.buildPrescriptionDoc(data);
    doc.save(`prescription_${data.patientName.replace(' ','_')}_${data.date}.pdf`);
  }

  generatePrescriptionArray(data: {
    doctorName: string; specialty: string;
    patientName: string; date: string;
    medications: { name: string; dosage: string; frequency: string; duration: string }[];
    instructions?: string;
  }): Uint8Array {
    const doc = this.buildPrescriptionDoc(data);
    return new Uint8Array(doc.output('arraybuffer'));
  }

  private buildPrescriptionDoc(data: {
    doctorName: string; specialty: string;
    patientName: string; date: string;
    medications: { name: string; dosage: string; frequency: string; duration: string }[];
    instructions?: string;
  }): jsPDF {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const w = doc.internal.pageSize.getWidth();

    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, w, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18); doc.setFont('helvetica','bold');
    doc.text('MediSync', 14, 12);
    doc.setFontSize(11); doc.setFont('helvetica','normal');
    doc.text('Electronic Prescription', 14, 20);
    doc.text(`Date: ${data.date}`, w - 14, 20, { align: 'right' });

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(13); doc.setFont('helvetica','bold');
    doc.text(data.doctorName, 14, 38);
    doc.setFontSize(10); doc.setFont('helvetica','normal');
    doc.setTextColor(107, 114, 128);
    doc.text(data.specialty, 14, 44);
    doc.setDrawColor(240, 242, 245);
    doc.line(14, 48, w - 14, 48);

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10); doc.setFont('helvetica','bold');
    doc.text('Patient:', 14, 56);
    doc.setFont('helvetica','normal');
    doc.text(data.patientName, 35, 56);

    doc.setFillColor(248, 250, 252);
    doc.rect(14, 62, w - 28, 8, 'F');
    doc.setFontSize(9); doc.setFont('helvetica','bold');
    doc.setTextColor(107, 114, 128);
    doc.text('MEDICATION', 17, 67.5);
    doc.text('DOSAGE', 80, 67.5);
    doc.text('FREQUENCY', 120, 67.5);
    doc.text('DURATION', 162, 67.5);

    let y = 75;
    doc.setFont('helvetica','normal');
    doc.setTextColor(30, 30, 30);
    data.medications.forEach((med, i) => {
      if (i % 2 === 0) {
        doc.setFillColor(250, 251, 252);
        doc.rect(14, y - 4, w - 28, 9, 'F');
      }
      doc.setFontSize(10);
      doc.text(med.name, 17, y + 1);
      doc.text(med.dosage, 80, y + 1);
      doc.text(med.frequency, 120, y + 1);
      doc.text(med.duration, 162, y + 1);
      y += 10;
    });

    if (data.instructions) {
      y += 5;
      doc.setDrawColor(240, 242, 245);
      doc.line(14, y, w-14, y);
      y += 8;
      doc.setFont('helvetica','bold'); doc.setFontSize(10);
      doc.text('Instructions:', 14, y);
      y += 6;
      doc.setFont('helvetica','normal');
      const lines = doc.splitTextToSize(data.instructions, w - 28);
      doc.text(lines, 14, y);
    }

    const pageH = doc.internal.pageSize.getHeight();
    doc.setDrawColor(240, 242, 245);
    doc.line(14, pageH - 20, w - 14, pageH - 20);
    doc.setFontSize(8); doc.setTextColor(156, 163, 180);
    doc.text('MediSync · Healthcare Management Platform · © 2026', w/2, pageH - 14, { align: 'center' });
    doc.text('This prescription was generated electronically and is valid without a signature.', w/2, pageH - 9, { align: 'center' });

    return doc;
  }

  generateInvoiceArray(data: {
    invoiceNumber: string; patientName: string;
    doctorName: string; date: string;
    services: { name: string; qty: number; price: number }[];
    total: number; status: string;
  }): Uint8Array {
    const doc = this.buildInvoiceDoc(data);
    return new Uint8Array(doc.output('arraybuffer'));
  }

  generateInvoiceBlob(data: {
    invoiceNumber: string; patientName: string;
    doctorName: string; date: string;
    services: { name: string; qty: number; price: number }[];
    total: number; status: string;
  }): string | null {
    const doc = this.buildInvoiceDoc(data);
    const blob = doc.output('blob');
    return URL.createObjectURL(blob);
  }

  private buildInvoiceDoc(data: {
    invoiceNumber: string; patientName: string;
    doctorName: string; date: string;
    services: { name: string; qty: number; price: number }[];
    total: number; status: string;
  }): jsPDF {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const w = doc.internal.pageSize.getWidth();

    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, w, 28, 'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(18); doc.setFont('helvetica','bold');
    doc.text('MediSync', 14, 12);
    doc.setFontSize(11); doc.setFont('helvetica','normal');
    doc.text('Invoice', 14, 20);
    doc.text(`#${data.invoiceNumber}`, w-14, 12, { align:'right' });
    doc.text(data.date, w-14, 20, { align:'right' });

    doc.setTextColor(30,30,30);
    doc.setFontSize(11); doc.setFont('helvetica','bold');
    doc.text('Bill To:', 14, 38);
    doc.setFont('helvetica','normal'); doc.setFontSize(10);
    doc.text(data.patientName, 14, 45);
    doc.text(`Doctor: ${data.doctorName}`, 14, 51);
    doc.line(14, 56, w-14, 56);

    doc.setFillColor(248,250,252);
    doc.rect(14, 60, w-28, 8, 'F');
    doc.setFontSize(9); doc.setFont('helvetica','bold');
    doc.setTextColor(107,114,128);
    doc.text('SERVICE', 17, 65.5);
    doc.text('QTY', 130, 65.5);
    doc.text('UNIT PRICE', 150, 65.5);
    doc.text('TOTAL', w-17, 65.5, { align:'right' });

    let y = 74;
    doc.setFont('helvetica','normal'); doc.setTextColor(30,30,30);
    data.services.forEach((s, i) => {
      if (i%2===0) { doc.setFillColor(250,251,252); doc.rect(14,y-4,w-28,9,'F'); }
      doc.setFontSize(10);
      doc.text(s.name, 17, y+1);
      doc.text(String(s.qty), 133, y+1);
      doc.text(`${s.price.toFixed(2)} MAD`, 153, y+1);
      doc.text(`${(s.qty*s.price).toFixed(2)} MAD`, w-17, y+1, { align:'right' });
      y += 10;
    });

    y += 5;
    doc.setFillColor(79,70,229);
    doc.rect(w-60, y, 46, 10, 'F');
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold');
    doc.text(`TOTAL: ${data.total.toFixed(2)} MAD`, w-14, y+7, { align:'right' });

    const ph = doc.internal.pageSize.getHeight();
    doc.setFontSize(8); doc.setTextColor(156,163,180);
    doc.text('MediSync · Healthcare Management Platform · © 2026', w/2, ph-10, { align:'center' });

    return doc;
  }

  generateInvoice(data: {
    invoiceNumber: string; patientName: string;
    doctorName: string; date: string;
    services: { name: string; qty: number; price: number }[];
    total: number; status: string;
  }): void {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const w = doc.internal.pageSize.getWidth();

    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, w, 28, 'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(18); doc.setFont('helvetica','bold');
    doc.text('MediSync', 14, 12);
    doc.setFontSize(11); doc.setFont('helvetica','normal');
    doc.text('Invoice', 14, 20);
    doc.text(`#${data.invoiceNumber}`, w-14, 12, { align:'right' });
    doc.text(data.date, w-14, 20, { align:'right' });

    doc.setTextColor(30,30,30);
    doc.setFontSize(11); doc.setFont('helvetica','bold');
    doc.text('Bill To:', 14, 38);
    doc.setFont('helvetica','normal'); doc.setFontSize(10);
    doc.text(data.patientName, 14, 45);
    doc.text(`Doctor: ${data.doctorName}`, 14, 51);
    doc.line(14, 56, w-14, 56);

    doc.setFillColor(248,250,252);
    doc.rect(14, 60, w-28, 8, 'F');
    doc.setFontSize(9); doc.setFont('helvetica','bold');
    doc.setTextColor(107,114,128);
    doc.text('SERVICE', 17, 65.5);
    doc.text('QTY', 130, 65.5);
    doc.text('UNIT PRICE', 150, 65.5);
    doc.text('TOTAL', w-17, 65.5, { align:'right' });

    let y = 74;
    doc.setFont('helvetica','normal'); doc.setTextColor(30,30,30);
    data.services.forEach((s, i) => {
      if (i%2===0) { doc.setFillColor(250,251,252); doc.rect(14,y-4,w-28,9,'F'); }
      doc.setFontSize(10);
      doc.text(s.name, 17, y+1);
      doc.text(String(s.qty), 133, y+1);
      doc.text(`${s.price.toFixed(2)} MAD`, 153, y+1);
      doc.text(`${(s.qty*s.price).toFixed(2)} MAD`, w-17, y+1, { align:'right' });
      y += 10;
    });

    y += 5;
    doc.setFillColor(79,70,229);
    doc.rect(w-60, y, 46, 10, 'F');
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold');
    doc.text(`TOTAL: ${data.total.toFixed(2)} MAD`, w-14, y+7, { align:'right' });

    const ph = doc.internal.pageSize.getHeight();
    doc.setFontSize(8); doc.setTextColor(156,163,180);
    doc.text('MediSync · Healthcare Management Platform · © 2026', w/2, ph-10, { align:'center' });

    doc.save(`invoice_${data.invoiceNumber}.pdf`);
  }
}
