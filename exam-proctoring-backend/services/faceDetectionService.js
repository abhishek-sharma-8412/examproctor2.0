// services/faceDetectionService.js
const faceapi = require('face-api.js');
const canvas = require('canvas');
const path = require('path');
const fs = require('fs');

// Configure face-api.js to use node-canvas
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// Path to models
const MODELS_PATH = path.join(__dirname, '../models');

// Initialize models
let modelsLoaded = false;

// Load models
async function loadModels() {
  if (modelsLoaded) return;
  
  try {
    // Make sure models directory exists
    if (!fs.existsSync(MODELS_PATH)) {
      fs.mkdirSync(MODELS_PATH, { recursive: true });
    }
    
    // Load all required models for better detection
    await faceapi.nets.tinyFaceDetector.loadFromDisk(MODELS_PATH);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_PATH);
    await faceapi.nets.faceExpressionNet.loadFromDisk(MODELS_PATH);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_PATH);
    
    modelsLoaded = true;
    console.log('Face detection models loaded successfully');
  } catch (error) {
    console.error('Error loading face detection models:', error);
    throw error;
  }
}

// Detect faces in image with improved accuracy
async function detectFaces(imageBuffer) {
  try {
    if (!modelsLoaded) {
      await loadModels();
    }
    
    // Create canvas from image buffer
    const img = new Image();
    img.src = imageBuffer;
    
    // Use more strict detection parameters
    const options = new faceapi.TinyFaceDetectorOptions({ 
      inputSize: 416,      // Larger input size for better accuracy
      scoreThreshold: 0.6  // Higher threshold to reduce false positives
    });
    
    // Detect faces with landmarks and expressions
    const detections = await faceapi.detectAllFaces(img, options)
      .withFaceLandmarks()
      .withFaceExpressions();
    
    // If no faces are detected with high confidence, return empty
    if (detections.length === 0) {
      return {
        faceCount: 0,
        detections: []
      };
    }
    
    // Filter out low confidence detections
    const highConfidenceDetections = detections.filter(
      d => d.detection.score > 0.7
    );
    
    return {
      faceCount: highConfidenceDetections.length,
      detections: highConfidenceDetections.map(d => ({
        box: d.detection.box,
        score: d.detection.score,
        landmarks: d.landmarks.positions,
        expressions: d.expressions,
        leftEye: d.landmarks.getLeftEye(),
        rightEye: d.landmarks.getRightEye()
      }))
    };
  } catch (error) {
    console.error('Error detecting faces:', error);
    throw error;
  }
}

// Improved Eye Aspect Ratio (EAR) calculation
function calculateEAR(leftEye, rightEye) {
  if (!leftEye || !rightEye) return null;
  
  try {
    // Calculate EAR for left eye
    const leftEAR = calculateEyeAspectRatio(leftEye);
    
    // Calculate EAR for right eye
    const rightEAR = calculateEyeAspectRatio(rightEye);
    
    // Average of both eyes
    return (leftEAR + rightEAR) / 2;
  } catch (error) {
    console.error('Error calculating EAR:', error);
    return null;
  }
}

function calculateEyeAspectRatio(eye) {
  // Vertical eye landmarks
  const p1 = eye[1];
  const p2 = eye[5];
  const p3 = eye[2];
  const p4 = eye[4];
  
  // Horizontal eye landmarks
  const p5 = eye[0];
  const p6 = eye[3];
  
  // Calculate euclidean distances
  const a = Math.sqrt(Math.pow(p2.x - p6.x, 2) + Math.pow(p2.y - p6.y, 2));
  const b = Math.sqrt(Math.pow(p3.x - p5.x, 2) + Math.pow(p3.y - p5.y, 2));
  const c = Math.sqrt(Math.pow(p1.x - p4.x, 2) + Math.pow(p1.y - p4.y, 2));
  
  // Calculate EAR
  return (a + b) / (2.0 * c);
}

// Enhanced suspicious eye movement detection
function detectSuspiciousEyeMovement(ear, eyePositions) {
  if (ear === null) return { suspicious: false, reason: 'No eye data' };
  
  // EAR threshold for closed eyes
  if (ear < 0.2) {
    return { 
      suspicious: true, 
      reason: 'Eyes nearly closed or looking down',
      ear: ear
    };
  }
  
  // Check for gaze direction if eye positions are available
  if (eyePositions && eyePositions.leftEye && eyePositions.rightEye) {
    // Calculate gaze direction based on eye centers
    const leftEyeCenter = getEyeCenter(eyePositions.leftEye);
    const rightEyeCenter = getEyeCenter(eyePositions.rightEye);
    
    // Check if gaze is significantly off-center
    const gazeOffset = calculateGazeOffset(leftEyeCenter, rightEyeCenter);
    if (gazeOffset > 0.2) {
      return {
        suspicious: true,
        reason: 'Looking away from screen',
        gazeOffset: gazeOffset
      };
    }
  }
  
  return { suspicious: false, reason: 'Normal eye position', ear: ear };
}

// Calculate eye center
function getEyeCenter(eye) {
  const sumX = eye.reduce((sum, point) => sum + point.x, 0);
  const sumY = eye.reduce((sum, point) => sum + point.y, 0);
  return {
    x: sumX / eye.length,
    y: sumY / eye.length
  };
}

// Calculate gaze offset from center
function calculateGazeOffset(leftEyeCenter, rightEyeCenter) {
  // Calculate the midpoint between eyes
  const midpoint = {
    x: (leftEyeCenter.x + rightEyeCenter.x) / 2,
    y: (leftEyeCenter.y + rightEyeCenter.y) / 2
  };
  
  // Calculate normalized horizontal and vertical offsets
  const horizontalOffset = Math.abs(midpoint.x - 0.5);
  const verticalOffset = Math.abs(midpoint.y - 0.5);
  
  // Return the maximum offset
  return Math.max(horizontalOffset, verticalOffset);
}

// Compare faces to check if they match with improved accuracy
async function compareFaces(referenceImageBuffer, currentImageBuffer, threshold = 0.6) {
  try {
    if (!modelsLoaded) {
      await loadModels();
    }
    
    // Load images
    const referenceImg = new Image();
    referenceImg.src = referenceImageBuffer;
    
    const currentImg = new Image();
    currentImg.src = currentImageBuffer;
    
    // Detect faces in both images with higher confidence
    const options = new faceapi.TinyFaceDetectorOptions({ 
      inputSize: 416,
      scoreThreshold: 0.6
    });
    
    const referenceFaceDetection = await faceapi.detectSingleFace(
      referenceImg, 
      options
    ).withFaceLandmarks().withFaceDescriptor();
    
    const currentFaceDetection = await faceapi.detectSingleFace(
      currentImg, 
      options
    ).withFaceLandmarks().withFaceDescriptor();
    
    if (!referenceFaceDetection || !currentFaceDetection) {
      return { match: false, similarity: 0 };
    }
    
    // Calculate face similarity (Euclidean distance)
    const distance = faceapi.euclideanDistance(
      referenceFaceDetection.descriptor, 
      currentFaceDetection.descriptor
    );
    
    const similarity = 1 - distance;
    
    return {
      match: similarity > threshold,
      similarity,
      confidence: Math.min(
        referenceFaceDetection.detection.score,
        currentFaceDetection.detection.score
      )
    };
  } catch (error) {
    console.error('Error comparing faces:', error);
    return { match: false, similarity: 0 };
  }
}

module.exports = {
  loadModels,
  detectFaces,
  calculateEAR,
  detectSuspiciousEyeMovement,
  compareFaces
};
