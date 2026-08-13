const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary, configureCloudinary } = require('../config/cloudinary');

const isCloudinaryActive = configureCloudinary();

let storage;

if (isCloudinaryActive) {
  // Primary: Cloudinary Storage
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'salman_hair_studio',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 1200, crop: 'limit' }],
    },
  });
} else if (process.env.NODE_ENV === 'production') {
  // In production, fallback to ephemeral disk storage is disabled for security and data retention.
  storage = {
    _handleFile(req, file, cb) {
      cb(new Error('Cloudinary storage configuration is missing or inactive in production environment. Local file fallback disabled.'));
    },
    _removeFile(req, file, cb) {
      cb(null);
    },
  };
} else {
  // Fallback: Local Disk Storage for local dev environment only
  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    },
  });
}

// File Filter for Image Formats
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid image format. Supported formats: JPG, PNG, WEBP'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter,
});

module.exports = upload;
