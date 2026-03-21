class ChatbotError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ChatbotError';
    this.statusCode = options.statusCode || 500;
    this.code = options.code || 'CHATBOT_ERROR';
    this.details = options.details;
  }
}

module.exports = ChatbotError;
