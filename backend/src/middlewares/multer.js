import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${sanitized}`);
  }
});

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'application/dicom',
  'application/octet-stream' // DICOM files often come as octet-stream
];

const fileFilter = (req, file, cb) => {
  const isDicom = file.originalname.toLowerCase().endsWith('.dcm') ||
                  file.originalname.toLowerCase().endsWith('.dicom');
  if (ALLOWED_MIME_TYPES.includes(file.mimetype) || isDicom) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Accepted: PDF, JPG, PNG, DICOM`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // 20 MB
});

export default upload;