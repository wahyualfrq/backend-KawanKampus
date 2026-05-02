const express = require('express');
const chatbotController = require('./chatbot.controller');
const authenticate = require('../../common/middleware/auth.middleware');
const validate = require('../../common/middleware/validate.middleware');
const { chatSchema } = require('../../common/validators/chatbot.validator');

const router = express.Router();

router.use(authenticate);
router.post('/', validate(chatSchema), chatbotController.chat.bind(chatbotController));

module.exports = router;
