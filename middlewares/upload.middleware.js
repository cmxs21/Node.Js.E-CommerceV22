import multer from 'multer'; //To handle multipart/form-data, which is used to upload files
import path from 'path';
import fs from 'fs';

const uploadDir = 'public/uploads/';

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true }); //Create the directory if it doesn't exist recursively
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);

    const fileExtension = path.extname(file.originalname);

    cb(null, `product-${uniqueSuffix}${fileExtension}`);
  },
});

const fileFilter = function (req, file, cb) {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error(req.t('invalidImageType')), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 10,
  },
});

const uploadSingleImage = upload.single('image');

const uploadMultipleImages = upload.array('images', 10);

const getFileURL = function (req, filename) {
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}/${uploadDir}${filename}`;
};

const handleUploadError = function (error, req, res, next) {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res
          .status(400)
          .json({ success: false, message: req.t('fileSizeExceeded') });
      case 'LIMIT_FILE_COUNT':
        return res
          .status(400)
          .json({ success: false, message: req.t('fileCountExceeded') });
      case 'LIMIT_UNEXPECTED_FILE':
        return res
          .status(400)
          .json({ success: false, message: req.t('fileTypeNotAllowed') });
      default:
        return res
          .status(400)
          .json({ success: false, message: req.t('fileUploadFailed') });
    }
  } else if (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
  next();
};

export {
  uploadSingleImage,
  uploadMultipleImages,
  getFileURL,
  handleUploadError,
};
