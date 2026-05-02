const express = require('express');
const taskController = require('./task.controller');
const authenticate = require('../../common/middleware/auth.middleware');
const validate = require('../../common/middleware/validate.middleware');
const { createTaskSchema, updateTaskSchema, getTasksSchema } = require('../../common/validators/task.validator');

const router = express.Router();

// All task routes are protected
router.use(authenticate);

router.get('/', validate(getTasksSchema), taskController.getTasks.bind(taskController));
router.post('/', validate(createTaskSchema), taskController.createTask.bind(taskController));
router.patch('/:id', validate(updateTaskSchema), taskController.updateTask.bind(taskController));
router.delete('/:id', taskController.deleteTask.bind(taskController));

module.exports = router;
