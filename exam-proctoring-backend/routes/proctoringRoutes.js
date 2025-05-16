// routes/proctoringRoutes.js
const express = require('express');
const router = express.Router();
const proctoringController = require('../controllers/proctoringController');
const upload = require('../middleware/upload');

// Routes
router.post('/log', upload.single('screenshot'), proctoringController.logEvent);
router.post('/sessions/:sessionId/verify-face', upload.single('faceImage'), proctoringController.verifyFace);
router.get('/sessions/:sessionId/logs', proctoringController.getSessionLogs);
router.get('/exams/:examId/sessions', proctoringController.getExamSessions);

module.exports = router;
