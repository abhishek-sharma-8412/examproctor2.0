import { useState, useEffect, useRef } from 'react';
import { proctoringService } from '../services/api';
import * as faceapi from 'face-api.js';

export const useProctoring = (sessionId) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [tabFocused, setTabFocused] = useState(true);
  const [warnings, setWarnings] = useState([]);
  const [faceDetected, setFaceDetected] = useState(true);
  const [multipleFaces, setMultipleFaces] = useState(false);
  const [eyeMovement, setEyeMovement] = useState('normal');
  const [faceVerified, setFaceVerified] = useState(false);

  const webcamRef = useRef(null);
  const streamRef = useRef(null);
  const faceCheckIntervalRef = useRef(null);
  const faceApiLoadedRef = useRef(false);

  // Join exam session for real-time updates
  useEffect(() => {
    if (sessionId) {
      proctoringService.joinExamSession(sessionId);
    }
  }, [sessionId]);

  // Load face-api.js models once
  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        faceApiLoadedRef.current = true;
      } catch (err) {
        console.error('Error loading face-api.js models:', err);
        addWarning('Face detection models failed to load');
      }
    };
    loadModels();
  }, []);

  // Request full screen
  const requestFullScreen = () => {
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.mozRequestFullScreen) {
      element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
      element.msRequestFullscreen();
    }
  };

  // Exit full screen
  const exitFullScreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  };

  // Start webcam
  const startWebcam = async () => {
    try {
      if (streamRef.current) {
        if (webcamRef.current) {
          webcamRef.current.srcObject = streamRef.current;
        }
        return true;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });
      if (webcamRef.current) {
        webcamRef.current.srcObject = stream;
        webcamRef.current.onloadedmetadata = () => {
          webcamRef.current.play().catch(e => console.error("Error playing video:", e));
        };
      }
      streamRef.current = stream;
      console.log("Webcam started successfully");
      return true;
    } catch (err) {
      console.error("Error accessing webcam:", err);
      addWarning("Webcam access denied or unavailable");
      return false;
    }
  };

  // Stop webcam
  const stopWebcam = () => {
    if (faceCheckIntervalRef.current) {
      clearInterval(faceCheckIntervalRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Take screenshot
  const takeScreenshot = async () => {
    if (!webcamRef.current || !webcamRef.current.videoWidth) return null;
    const canvas = document.createElement('canvas');
    canvas.width = webcamRef.current.videoWidth;
    canvas.height = webcamRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(webcamRef.current, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.8);
    });
  };

  // Register face for proctoring
  const registerFace = async () => {
    if (!sessionId) return null;
    try {
      const screenshot = await takeScreenshot();
      if (!screenshot) return null;
      const result = await proctoringService.registerFace(sessionId, screenshot);
      setFaceVerified(true);
      return result;
    } catch (error) {
      console.error('Error registering face:', error);
      return null;
    }
  };

  // Real-time face detection using face-api.js
  useEffect(() => {
    let animationFrameId;
    const detectFaces = async () => {
      if (
        webcamRef.current &&
        webcamRef.current.readyState === 4 &&
        faceApiLoadedRef.current
      ) {
        try {
          const detections = await faceapi.detectAllFaces(
            webcamRef.current,
            new faceapi.TinyFaceDetectorOptions()
          );
          setFaceDetected(detections.length === 1);
          setMultipleFaces(detections.length > 1);

          // Optionally, add warnings (debounced)
          if (detections.length === 0) {
            addWarning("Face not detected. Please ensure your face is visible.");
          } else if (detections.length > 1) {
            addWarning("Multiple faces detected. Only the exam taker should be visible.");
          }
        } catch (err) {
          console.error('Face detection error:', err);
        }
      }
      animationFrameId = requestAnimationFrame(detectFaces);
    };

    detectFaces();
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
    // eslint-disable-next-line
  }, [webcamRef, faceApiLoadedRef]);

  // Face verification with backend (existing logic)
  const startFaceVerification = () => {
    if (faceCheckIntervalRef.current) {
      clearInterval(faceCheckIntervalRef.current);
    }
    faceCheckIntervalRef.current = setInterval(async () => {
      try {
        const screenshot = await takeScreenshot();
        if (!screenshot) return;
        const result = await proctoringService.verifyFace(sessionId, screenshot);
        setFaceDetected(result.faceDetected);
        setMultipleFaces(result.multipleFaces);
        if (result.suspiciousEyeMovement) {
          setEyeMovement('suspicious');
          const reason = result.eyeMovementDetails?.reason || 'Suspicious eye movement';
          addWarning(reason);
        } else {
          setEyeMovement('normal');
        }
        if (!result.faceDetected) {
          addWarning("Face not detected - please look at the camera");
        } else if (result.multipleFaces) {
          addWarning(`Multiple faces detected (${result.faceCount})`);
        } else if (!result.faceMatched && result.similarity < 0.5) {
          addWarning("Face doesn't match registered face - possible impersonation");
        }
      } catch (error) {
        console.error('Face verification error:', error);
      }
    }, 5000);
  };

  // Log proctoring event
  const logProctoringEvent = async (eventType, details = {}) => {
    if (!sessionId) return;
    try {
      const screenshot = await takeScreenshot();
      await proctoringService.logEvent(sessionId, eventType, details, screenshot);
    } catch (error) {
      console.error('Error logging proctoring event:', error);
    }
  };

  // Add warning with timestamp
  const addWarning = (message) => {
    const warning = {
      id: Date.now(),
      message,
      timestamp: new Date().toISOString(),
    };
    setWarnings(prev => [...prev, warning]);
  };

  // Monitor full screen changes
  useEffect(() => {
    const handleFullScreenChange = () => {
      const isInFullScreen = !!(
        document.fullscreenElement ||
        document.mozFullScreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
      );
      setIsFullScreen(isInFullScreen);
      if (!isInFullScreen && sessionId) {
        logProctoringEvent('full_screen_exit');
        addWarning("Full screen mode exited");
      }
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    document.addEventListener('mozfullscreenchange', handleFullScreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullScreenChange);
    document.addEventListener('msfullscreenchange', handleFullScreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullScreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullScreenChange);
      document.removeEventListener('msfullscreenchange', handleFullScreenChange);
    };
  }, [sessionId]);

  // Monitor tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabFocused(false);
        if (sessionId) {
          logProctoringEvent('tab_switch');
        }
        addWarning("Tab switched");
      } else {
        setTabFocused(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sessionId]);

  // Prevent context menu
  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault();
      addWarning("Right-click attempted");
      return false;
    };

    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // Prevent copy-paste
  useEffect(() => {
    const handleCopy = (e) => {
      e.preventDefault();
      addWarning("Copy attempted");
      return false;
    };

    const handlePaste = (e) => {
      e.preventDefault();
      addWarning("Paste attempted");
      return false;
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
    };
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  return {
    isFullScreen,
    tabFocused,
    warnings,
    faceDetected,
    multipleFaces,
    eyeMovement,
    faceVerified,
    webcamRef,
    requestFullScreen,
    exitFullScreen,
    startWebcam,
    stopWebcam,
    registerFace,
    startFaceVerification,
    takeScreenshot
  };
};
