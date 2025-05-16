import { useState, useEffect, useRef } from 'react';
import { proctoringService } from '../services/api';

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
  
  // Join exam session for real-time updates
  useEffect(() => {
    if (sessionId) {
      proctoringService.joinExamSession(sessionId);
    }
  }, [sessionId]);

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
      // First check if we already have a stream
      if (streamRef.current) {
        if (webcamRef.current) {
          webcamRef.current.srcObject = streamRef.current;
        }
        return true;
      }
      
      // Explicitly request the laptop's camera
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
// src/hooks/useProctoring.js (partial update)

// Update the startFaceVerification function
const startFaceVerification = () => {
  if (faceCheckIntervalRef.current) {
    clearInterval(faceCheckIntervalRef.current);
  }
  
  // Check face every 5 seconds (more frequent checks)
  faceCheckIntervalRef.current = setInterval(async () => {
    try {
      const screenshot = await takeScreenshot();
      if (!screenshot) return;
      
      const result = await proctoringService.verifyFace(sessionId, screenshot);
      
      // Update states based on verification result with more accurate detection
      setFaceDetected(result.faceDetected);
      setMultipleFaces(result.multipleFaces);
      
      // Handle suspicious eye movement with more details
      if (result.suspiciousEyeMovement) {
        setEyeMovement('suspicious');
        const reason = result.eyeMovementDetails?.reason || 'Suspicious eye movement';
        addWarning(reason);
      } else {
        setEyeMovement('normal');
      }
      
      // Handle face detection issues
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
  }, 5000); // Check every 5 seconds for better responsiveness
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
