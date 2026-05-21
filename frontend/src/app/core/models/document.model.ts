export interface MedicalDocument {
  id: string;
  filename: string;
  filepath: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  patientName?: string;
  createdAt: string;
}
