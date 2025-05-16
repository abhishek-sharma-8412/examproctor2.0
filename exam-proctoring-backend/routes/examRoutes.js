// routes/examRoutes.js
const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const upload = require('../middleware/upload');

// Routes
router.get('/', examController.getExams);
router.get('/:id', examController.getExamById);
router.post('/sample', examController.createSampleExam);
router.post('/sessions', examController.startExamSession);
router.post('/sessions/:sessionId/face', upload.single('faceImage'), examController.registerFace);
router.post('/answers', examController.submitAnswer);
router.post('/sessions/:sessionId/submit', examController.submitExam);
router.get('/sessions/:sessionId/results', examController.getExamResults);

module.exports = router;
