// controllers/proctoringController.js
const supabase = require('../config/supabase');
const faceDetectionService = require('../services/faceDetectionService');
const fs = require('fs');
const path = require('path');

// Log a proctoring event
exports.logEvent = async (req, res) => {
  try {
    const { sessionId, eventType, details } = req.body;
    let screenshotUrl = null;
    
    // Handle screenshot upload if present
    if (req.file) {
      screenshotUrl = `/uploads/${req.file.filename}`;
    }
    
    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('exam_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (sessionError) throw sessionError;
    
    // Create proctoring log
    const { data, error } = await supabase
      .from('proctoring_logs')
      .insert({
        session_id: sessionId,
        event_type: eventType,
        details: details ? JSON.parse(details) : {},
        screenshot_url: screenshotUrl
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Emit event via Socket.io for real-time updates
    if (req.io) {
      // Notify the proctor
      req.io.to(`proctor:${session.exam_id}`).emit('proctoring-event', {
        sessionId,
        studentName: session.student_name,
        examId: session.exam_id,
        eventType,
        timestamp: new Date()
      });
    }
    
    res.status(201).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Log proctoring event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Verify face during exam with improved accuracy
exports.verifyFace = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No face image provided'
      });
    }
    
    // Get the reference face image
    const { data: session, error: sessionError } = await supabase
      .from('exam_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (sessionError || !session.face_image_url) {
      return res.status(400).json({
        success: false,
        message: 'No reference face image found for this session'
      });
    }
    
    // Load reference image
    const referenceImagePath = path.join(__dirname, '..', session.face_image_url);
    if (!fs.existsSync(referenceImagePath)) {
      return res.status(400).json({
        success: false,
        message: 'Reference face image file not found'
      });
    }
    
    // Detect faces in the current image with improved accuracy
    const currentImageBuffer = fs.readFileSync(req.file.path);
    const faceDetection = await faceDetectionService.detectFaces(currentImageBuffer);
    
    // Check if face is detected - more strict checking
    if (faceDetection.faceCount === 0) {
      // Log event
      await supabase
        .from('proctoring_logs')
        .insert({
          session_id: sessionId,
          event_type: 'face_not_detected',
          details: { confidence: 'high' },
          screenshot_url: `/uploads/${req.file.filename}`
        });
      
      return res.status(200).json({
        success: true,
        data: {
          faceDetected: false,
          multipleFaces: false,
          message: 'No face detected',
          confidence: 'high'
        }
      });
    }
    
    // Check if multiple faces are detected
    if (faceDetection.faceCount > 1) {
      // Log event
      await supabase
        .from('proctoring_logs')
        .insert({
          session_id: sessionId,
          event_type: 'multiple_faces',
          details: { 
            count: faceDetection.faceCount,
            scores: faceDetection.detections.map(d => d.score)
          },
          screenshot_url: `/uploads/${req.file.filename}`
        });
      
      return res.status(200).json({
        success: true,
        data: {
          faceDetected: true,
          multipleFaces: true,
          message: 'Multiple faces detected',
          faceCount: faceDetection.faceCount
        }
      });
    }
    
    // Compare with reference face
    const referenceImageBuffer = fs.readFileSync(referenceImagePath);
    const comparison = await faceDetectionService.compareFaces(
      referenceImageBuffer,
      currentImageBuffer
    );
    
    // Extract eye information for the detected face
    const leftEye = faceDetection.detections[0].leftEye;
    const rightEye = faceDetection.detections[0].rightEye;
    
    // Calculate EAR for eye movement detection
    const ear = faceDetectionService.calculateEAR(leftEye, rightEye);
    
    // Check for suspicious eye movement with enhanced detection
    const eyeMovementResult = faceDetectionService.detectSuspiciousEyeMovement(ear, {
      leftEye,
      rightEye
    });
    
    // Log suspicious eye movement if detected
    if (eyeMovementResult.suspicious) {
      await supabase
        .from('proctoring_logs')
        .insert({
          session_id: sessionId,
          event_type: 'suspicious_eye_movement',
          details: eyeMovementResult,
          screenshot_url: `/uploads/${req.file.filename}`
        });
    }
    
    res.status(200).json({
      success: true,
      data: {
        faceDetected: true,
        multipleFaces: false,
        faceMatched: comparison.match,
        similarity: comparison.similarity,
        confidence: comparison.confidence,
        suspiciousEyeMovement: eyeMovementResult.suspicious,
        eyeMovementDetails: eyeMovementResult,
        ear
      }
    });
  } catch (error) {
    console.error('Verify face error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get proctoring logs for a session
exports.getSessionLogs = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const { data, error } = await supabase
      .from('proctoring_logs')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get session logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get all active exam sessions for an exam
exports.getExamSessions = async (req, res) => {
  try {
    const { examId } = req.params;
    
    const { data, error } = await supabase
      .from('exam_sessions')
      .select(`
        *,
        proctoring_logs(count)
      `)
      .eq('exam_id', examId);
    
    if (error) throw error;
    
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get exam sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
