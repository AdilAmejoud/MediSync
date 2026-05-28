import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { PdfViewerModule } from 'ng2-pdf-viewer';

@Component({
  selector: 'ms-document-viewer',
  standalone: true,
  imports: [CommonModule, NgIconComponent, PdfViewerModule],
  templateUrl: './document-viewer.component.html',
  styleUrl: './document-viewer.component.scss'
})
export class DocumentViewerComponent {
  @Input() pdfData: Uint8Array | string | null = null;
  @Input() title = '';
  @Input() subtitle = '';
  @Input() showDownload = true;
  @Output() close = new EventEmitter<void>();
  @Output() download = new EventEmitter<void>();

  get isPdfUrl(): boolean {
    return typeof this.pdfData === 'string' && (this.pdfData as string).startsWith('http');
  }
}
