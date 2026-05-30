const express = require('express');
const historyController = require('./history.controller');
const authenticate = require('../../common/middleware/auth.middleware');

const router = express.Router();

router.get('/', authenticate, historyController.getHistories.bind(historyController));
router.post('/', authenticate, historyController.createHistory.bind(historyController));
router.delete('/', authenticate, historyController.clearHistories.bind(historyController));
router.delete('/:id', authenticate, historyController.deleteHistory.bind(historyController));

module.exports = router;
