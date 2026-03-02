const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }

    cb(null, true);
  }
});

const uploadAvatar = upload.single('avatar');
const uploadProductImages = upload.array('images', 10);

const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const validMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    const fileName = (file.originalname || '').toLowerCase();
    const hasValidExtension = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if ((!file.mimetype || !validMimeTypes.includes(file.mimetype)) && !hasValidExtension) {
      cb(new Error('Only Excel files are allowed'));
      return;
    }

    cb(null, true);
  }
});

const uploadExcel = excelUpload.single('file');

module.exports = {
  uploadAvatar,
  uploadProductImages,
  uploadExcel
};
