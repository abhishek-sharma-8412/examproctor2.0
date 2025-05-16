import { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';

export const useFaceDetection = (webcamRef) => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [multipleFaces, setMultipleFaces] = useState(false);
  const [faceCount, setFaceCount] = useState(0);
  const [detectionConfidence, setDetectionConfidence] = useState(0);
  const [eyeMovement, setEyeMovement] = useState('normal');
  const detectionIntervalRef = useRef(null);

  // Load face detection models
  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        ]);
        setIsModelLoaded(true);
        console.log('Face detection models loaded successfully');
      } catch (error) {
        console.error('Error loading face detection models:', error);
      }
    };
    loadModels();
  }, []);

  // Helper to estimate gaze direction
  const estimateGaze = (landmarks, box) => {
    if (!landmarks || !box) return 'normal';
    // Get eye positions
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    // Calculate average eye center
    const avgEyeX = (leftEye[0].x + rightEye[3].x) / 2;
    const avgEyeY = (leftEye[0].y + rightEye[3].y) / 2;
    // Get bounding box center
    const boxCenterX = box.x + box.width / 2;
    const boxCenterY = box.y + box.height / 2;
    // Compare eye center to box center
    const dx = avgEyeX - boxCenterX;
    const dy = avgEyeY - boxCenterY;
    // Heuristic: if dx or dy is large, user is looking away
    if (Math.abs(dx) > box.width * 0.15) return 'suspicious';
    if (Math.abs(dy) > box.height * 0.15) return 'suspicious';
    return 'normal';
  };

  // Start face detection
  const startFaceDetection = () => {
    if (!isModelLoaded || !webcamRef.current) return;
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    detectionIntervalRef.current = setInterval(async () => {
      if (
        !webcamRef.current ||
        !webcamRef.current.videoWidth ||
        webcamRef.current.readyState !== 4
      )
        return;
      try {
        const detections = await faceapi
          .detectAllFaces(
            webcamRef.current,
            new faceapi.TinyFaceDetectorOptions({
              inputSize: 608,
              scoreThreshold: 0.08, // even lower for more sensitivity
            })
          )
          .withFaceLandmarks();

        setFaceCount(detections.length);
        setFaceDetected(detections.length > 0);
        setMultipleFaces(detections.length > 1);

        if (detections.length > 0) {
          // Use the highest confidence
          const highestConfidence = Math.max(
            ...detections.map((d) => d.detection.score)
          );
          setDetectionConfidence(highestConfidence);

          // Eye movement for the most confident face
          const mainDetection = detections.reduce((prev, curr) =>
            prev.detection.score > curr.detection.score ? prev : curr
          );
          const gaze = estimateGaze(
            mainDetection.landmarks,
            mainDetection.detection.box
          );
          setEyeMovement(gaze);
        } else {
          setDetectionConfidence(0);
          setEyeMovement('normal');
        }
      } catch (error) {
        console.error('Error during face detection:', error);
      }
    }, 500); // 2 times per second
  };

  // Stop face detection
  const stopFaceDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopFaceDetection();
    };
  }, []);

  return {
    isModelLoaded,
    faceDetected,
    multipleFaces,
    faceCount,
    detectionConfidence,
    eyeMovement,
    startFaceDetection,
    stopFaceDetection,
  };
}; 