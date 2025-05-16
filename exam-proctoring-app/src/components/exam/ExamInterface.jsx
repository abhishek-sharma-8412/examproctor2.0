import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FiCamera, FiMonitor, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

import Header from '../common/Header';
import Card from '../common/Card';
import Button from '../common/Button';
import QuestionCard from './QuestionCard';
import WarningBanner from '../proctoring/WarningBanner';
import { useProctoring } from '../../hooks/useProctoring';

const ExamContainer = styled.div`
  min-height: 100vh;
  background-color: var(--background);
`;

const ExamContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 24px;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const QuestionsSection = styled.div`
  display: flex;
  flex-direction: column;
`;

const ProctoringSidebar = styled(Card)`
  height: fit-content;
  position: sticky;
  top: 90px;
`;

const WebcamContainer = styled.div`
  margin-bottom: 20px;
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

const StatusItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding: 8px;
  border-radius: 6px;
  background-color: ${props => props.status === 'ok' ? 'rgba(76, 201, 240, 0.1)' : 'rgba(230, 57, 70, 0.1)'};
`;

const StatusIcon = styled.div`
  color: ${props => props.status === 'ok' ? 'var(--success)' : 'var(--danger)'};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const StatusText = styled.div`
  flex: 1;
  font-size: 0.9rem;
`;

const SubmitSection = styled.div`
  margin-top: 40px;
  display: flex;
  justify-content: center;
`;

// Sample exam data
const sampleExam = {
  id: "exam123",
  title: "Advanced Computer Science",
  duration: 7200, // 2 hours in seconds
  questions: [
    {
      id: 1,
      text: "What is the time complexity of quicksort in the worst case?",
      points: 2,
      options: [
        { id: "a", text: "O(n)" },
        { id: "b", text: "O(n log n)" },
        { id: "c", text: "O(n<sup>2</sup>)" },
        { id: "d", text: "O(n!)" }
      ]
    },
    {
      id: 2,
      text: "Which of the following is NOT a React Hook?",
      points: 1,
      options: [
        { id: "a", text: "useEffect" },
        { id: "b", text: "useState" },
        { id: "c", text: "useHistory" },
        { id: "d", text: "useCallback" }
      ]
    },
    {
      id: 3,
      text: "What does the following code output?<pre>const arr = [1, 2, 3, 4, 5];\nconst result = arr.filter(num => num % 2 === 0).map(num => num * 2);\nconsole.log(result);</pre>",
      points: 3,
      options: [
        { id: "a", text: "[2, 4, 6, 8, 10]" },
        { id: "b", text: "[4, 8]" },
        { id: "c", text: "[2, 4]" },
        { id: "d", text: "[1, 3, 5]" }
      ]
    },
    {
      id: 4,
      text: "Which data structure would be most efficient for implementing a priority queue?",
      points: 2,
      options: [
        { id: "a", text: "Array" },
        { id: "b", text: "Linked List" },
        { id: "c", text: "Binary Search Tree" },
        { id: "d", text: "Heap" }
      ]
    },
    {
      id: 5,
      text: "What is the output of this Python code?<pre>def func(x, y=[]):\n    y.append(x)\n    return y\n\nprint(func(1))\nprint(func(2))\nprint(func(3, []))</pre>",
      points: 3,
      options: [
        { id: "a", text: "[1], [2], [3]" },
        { id: "b", text: "[1], [1, 2], [3]" },
        { id: "c", text: "[1], [2], [1, 2, 3]" },
        { id: "d", text: "[1, 2, 3], [1, 2, 3], [3]" }
      ]
    }
  ]
};

const ExamInterface = () => {
  const [timeLeft, setTimeLeft] = useState(sampleExam.duration);
  const [answers, setAnswers] = useState({});
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  
  const { 
    isFullScreen, 
    tabFocused, 
    faceDetected,
    multipleFaces,
    warnings,
    webcamRef,
    requestFullScreen,
    startWebcam
  } = useProctoring();

  // Handle answer changes
  const handleAnswerChange = (questionId, optionId) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  // Submit exam
  const handleSubmit = () => {
    // In a real app, you would send answers to your backend
    console.log("Submitting answers:", answers);
    setExamSubmitted(true);
  };

  // Initialize exam environment
  useEffect(() => {
    // Start webcam with a slight delay to ensure DOM is ready
    setTimeout(() => {
      startWebcam().then(success => {
        if (!success) {
          console.warn("Failed to initialize webcam");
          setCameraError(true);
        }
      }).catch(err => {
        console.error("Error starting webcam:", err);
        setCameraError(true);
      });
    }, 1000);
    
    // Request full screen
    requestFullScreen();
    
    // Countdown timer
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Cleanup
    return () => {
      clearInterval(timer);
    };
  }, []);

  // Handle webcam retry
  const handleRetryCamera = () => {
    setCameraError(false);
    startWebcam().then(success => {
      if (!success) {
        setCameraError(true);
      }
    }).catch(() => {
      setCameraError(true);
    });
  };

  if (examSubmitted) {
    return (
      <ExamContainer>
        <Header examTitle={sampleExam.title} timeLeft={0} examMode={true} />
        <div style={{ padding: '4rem', textAlign: 'center' }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <FiCheckCircle size={100} color="var(--success)" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Exam Submitted Successfully!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{ fontSize: '1.2rem', maxWidth: '600px', margin: '20px auto' }}
          >
            Thank you for completing the exam. Your responses have been recorded.
            You may now close this window.
          </motion.p>
        </div>
      </ExamContainer>
    );
  }

  return (
    <ExamContainer>
      <Header examTitle={sampleExam.title} timeLeft={timeLeft} examMode={true} />
      
      <ExamContent>
        <QuestionsSection>
          {!isFullScreen && (
            <WarningBanner 
              visible={true}
              message="Please enter full screen mode to continue the exam."
              actionText="Enter Full Screen"
              onAction={requestFullScreen}
            />
          )}
          
          {!tabFocused && (
            <WarningBanner 
              visible={true}
              message="Warning: Tab switching detected! Please stay on this tab."
            />
          )}
          
          {!faceDetected && !cameraError && (
            <WarningBanner 
              visible={true}
              message="Face not detected. Please ensure your face is visible."
            />
          )}
          
          {multipleFaces && (
            <WarningBanner 
              visible={true}
              message="Multiple faces detected. Only the exam taker should be visible."
            />
          )}
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {sampleExam.questions.map((question, index) => (
              <QuestionCard 
                key={question.id}
                question={question}
                number={index + 1}
                onAnswerChange={handleAnswerChange}
              />
            ))}
            
            <SubmitSection>
              <Button 
                size="large" 
                onClick={handleSubmit}
              >
                Submit Exam
              </Button>
            </SubmitSection>
          </motion.div>
        </QuestionsSection>
        
        <ProctoringSidebar>
          <h3>Proctoring Status</h3>
          
          <WebcamContainer>
            <Webcam 
              ref={webcamRef} 
              autoPlay 
              playsInline
              muted 
              onError={() => setCameraError(true)}
            />
            {cameraError && (
              <WebcamOverlay>
                <FiCamera size={32} />
                <p style={{ margin: '10px 0' }}>Camera access denied or unavailable</p>
                <Button 
                  size="small" 
                  onClick={handleRetryCamera}
                  style={{ marginTop: '10px' }}
                >
                  Enable Camera
                </Button>
              </WebcamOverlay>
            )}
          </WebcamContainer>
          
          <StatusItem status={isFullScreen ? 'ok' : 'error'}>
            <StatusIcon status={isFullScreen ? 'ok' : 'error'}>
              {isFullScreen ? <FiCheckCircle size={18} /> : <FiAlertCircle size={18} />}
            </StatusIcon>
            <StatusText>
              {isFullScreen ? 'Full screen mode active' : 'Full screen required'}
            </StatusText>
          </StatusItem>
          
          <StatusItem status={tabFocused ? 'ok' : 'error'}>
            <StatusIcon status={tabFocused ? 'ok' : 'error'}>
              {tabFocused ? <FiCheckCircle size={18} /> : <FiAlertCircle size={18} />}
            </StatusIcon>
            <StatusText>
              {tabFocused ? 'Tab focus maintained' : 'Tab switching detected'}
            </StatusText>
          </StatusItem>
          
          <StatusItem status={!cameraError && faceDetected ? 'ok' : 'error'}>
            <StatusIcon status={!cameraError && faceDetected ? 'ok' : 'error'}>
              {!cameraError && faceDetected ? <FiCheckCircle size={18} /> : <FiAlertCircle size={18} />}
            </StatusIcon>
            <StatusText>
              {cameraError ? 'Camera not available' : 
               faceDetected ? 'Face properly detected' : 'Face not detected'}
            </StatusText>
          </StatusItem>
          
          <StatusItem status={!multipleFaces ? 'ok' : 'error'}>
            <StatusIcon status={!multipleFaces ? 'ok' : 'error'}>
              {!multipleFaces ? <FiCheckCircle size={18} /> : <FiAlertCircle size={18} />}
            </StatusIcon>
            <StatusText>
              {!multipleFaces ? 'Single person detected' : 'Multiple people detected'}
            </StatusText>
          </StatusItem>
          
          {warnings.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h4>Recent Warnings ({warnings.length})</h4>
              <div style={{ maxHeight: '150px', overflowY: 'auto', marginTop: '10px' }}>
                {warnings.slice(-5).reverse().map(warning => (
                  <div key={warning.id} style={{ fontSize: '0.85rem', marginBottom: '8px', padding: '8px', backgroundColor: 'rgba(255, 190, 11, 0.1)', borderRadius: '4px' }}>
                    <div style={{ fontWeight: '500' }}>{warning.message}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {new Date(warning.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ProctoringSidebar>
      </ExamContent>
    </ExamContainer>
  );
};

export default ExamInterface;
