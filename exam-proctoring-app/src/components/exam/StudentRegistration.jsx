// src/components/exam/StudentRegistration.jsx
import { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiCamera } from 'react-icons/fi';
import Card from '../common/Card';
import Button from '../common/Button';
import { examService } from '../../services/api';

const FormContainer = styled(Card)`
  max-width: 500px;
  margin: 40px auto;
  padding: 30px;
`;

const Title = styled.h2`
  text-align: center;
  margin-bottom: 24px;
  color: var(--primary);
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 16px;
  
  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(67, 97, 238, 0.2);
  }
`;

const WebcamContainer = styled.div`
  margin-top: 20px;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  aspect-ratio: 4/3;
  background-color: #000;
`;

const Webcam = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const WebcamOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  flex-direction: column;
  text-align: center;
  padding: 16px;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 24px;
  gap: 16px;
`;

const StudentRegistration = ({ examId, onRegister }) => {
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [webcamActive, setWebcamActive] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [faceRegistered, setFaceRegistered] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const webcamRef = useRef(null);
  const streamRef = useRef(null);
  
  // Start webcam
  const startWebcam = async () => {
    try {
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
      setWebcamActive(true);
      setCameraError(false);
    } catch (err) {
      console.error("Error accessing webcam:", err);
      setCameraError(true);
    }
  };
  
  // Stop webcam
  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setWebcamActive(false);
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
  
  // Register for exam
  const handleRegister = async () => {
    if (!studentName.trim()) {
      alert('Please enter your name');
      return;
    }
    
    try {
      setLoading(true);
      
      // Start exam session
      const session = await examService.startExamSession(
        examId, 
        studentName, 
        studentEmail
      );
      
      setSessionId(session.id);
      
      // If webcam is active, register face
      if (webcamActive) {
        const screenshot = await takeScreenshot();
        if (screenshot) {
          await examService.registerFace(session.id, screenshot);
          setFaceRegistered(true);
        }
      }
      
      // Proceed to exam
      if (onRegister) {
        onRegister(session.id);
      }
    } catch (error) {
      console.error('Error registering for exam:', error);
      alert('Failed to register for exam. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);
  
  return (
    <FormContainer>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Title>Register for Exam</Title>
        
        <FormGroup>
          <Label htmlFor="studentName">
            <FiUser style={{ marginRight: '8px' }} />
            Your Name
          </Label>
          <Input
            id="studentName"
            type="text"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="Enter your full name"
            required
          />
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="studentEmail">
            <FiMail style={{ marginRight: '8px' }} />
            Your Email
          </Label>
          <Input
            id="studentEmail"
            type="email"
            value={studentEmail}
            onChange={(e) => setStudentEmail(e.target.value)}
            placeholder="Enter your email address"
          />
        </FormGroup>
        
        <FormGroup>
          <Label>
            <FiCamera style={{ marginRight: '8px' }} />
            Face Registration
          </Label>
          
          {!webcamActive ? (
            <Button
              onClick={startWebcam}
              disabled={loading}
              style={{ width: '100%' }}
            >
              Enable Camera
            </Button>
          ) : (
            <WebcamContainer>
              <Webcam 
                ref={webcamRef} 
                autoPlay 
                playsInline
                muted 
              />
              {cameraError && (
                <WebcamOverlay>
                  <FiCamera size={32} />
                  <p style={{ margin: '10px 0' }}>Camera access denied or unavailable</p>
                  <Button 
                    size="small" 
                    onClick={startWebcam}
                    style={{ marginTop: '10px' }}
                  >
                    Retry
                  </Button>
                </WebcamOverlay>
              )}
            </WebcamContainer>
          )}
        </FormGroup>
        
        <ButtonContainer>
          <Button
            onClick={handleRegister}
            disabled={loading || (!webcamActive && !cameraError)}
          >
            {loading ? 'Registering...' : 'Start Exam'}
          </Button>
        </ButtonContainer>
      </motion.div>
    </FormContainer>
  );
};

export default StudentRegistration;
