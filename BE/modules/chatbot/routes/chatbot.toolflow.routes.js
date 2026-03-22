const express = require('express');
const { requireAuth } = require('../../../middleware/auth.middleware');
const chatbotToolflowController = require('../controllers/chatbot.toolflow.controller');
const ChatbotError = require('../utils/chatbotError');

const router = express.Router();

router.post('/chat-with-tools', requireAuth, chatbotToolflowController.chat);

router.use((err, req, res, next) => {
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
