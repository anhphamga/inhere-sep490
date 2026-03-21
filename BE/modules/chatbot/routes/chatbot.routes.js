const express = require('express');
const multer = require('multer');
const chatbotController = require('../controllers/chatbot.controller');
const chatbotToolsRoutes = require('./chatbot.tools.routes');
const chatbotToolflowRoutes = require('./chatbot.toolflow.routes');
const ChatbotError = require('../utils/chatbotError');

const router = express.Router();

const maxFileSizeMb = Number(process.env.CHATBOT_INGEST_MAX_FILE_SIZE_MB) || 2;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxFileSizeMb * 1024 * 1024,
  },
});

router.post('/chat', chatbotController.chat);
router.post('/ingest', upload.single('file'), chatbotController.ingest);
router.use(chatbotToolsRoutes);
router.use(chatbotToolflowRoutes);

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const code = err.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'INVALID_UPLOAD';
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'Uploaded file is too large'
      : err.message;

    return res.status(400).json({
      success: false,
      error: {
        code,
        message,
      },
    });
  }

  if (err instanceof ChatbotError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  return next(err);
});

module.exports = router;
