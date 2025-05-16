import axios from 'axios';
import { io } from 'socket.io-client';

const API_URL = 'http://localhost:5000/api';
const socket = io('http://localhost:5000');

// Create axios instance
const api = axios.create({
  baseURL: API_URL
});

// Exam services
export const examService = {
  getExams: async () => {
    const response = await api.get('/exams');
    return response.data.data;
  },
  
  getExamById: async (id, role = 'student') => {
    const response = await api.get(`/exams/${id}?role=${role}`);
    return response.data.data;
  },
  
  startExamSession: async (examId, studentName, studentEmail) => {
    const response = await api.post('/exams/sessions', { 
      examId, 
      studentName, 
      studentEmail 
    });
    return response.data.data;
  },
  
  registerFace: async (sessionId, faceImage) => {
    const formData = new FormData();
    formData.append('faceImage', faceImage);
    
    const response = await api.post(`/exams/sessions/${sessionId}/face`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data.data;
  },
  
  submitAnswer: async (sessionId, questionId, optionId) => {
    const response = await api.post('/exams/answers', { sessionId, questionId, optionId });
    return response.data.data;
  },
  
  submitExam: async (sessionId) => {
    const response = await api.post(`/exams/sessions/${sessionId}/submit`);
    return response.data.data;
  },
  
  getExamResults: async (sessionId) => {
    const response = await api.get(`/exams/sessions/${sessionId}/results`);
    return response.data.data;
  }
};

// Proctoring services
export const proctoringService = {
  logEvent: async (sessionId, eventType, details = {}, screenshot = null) => {
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    formData.append('eventType', eventType);
    formData.append('details', JSON.stringify(details));
    
    if (screenshot) {
      formData.append('screenshot', screenshot);
    }
    
    const response = await api.post('/proctoring/log', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data.data;
  },
  
  verifyFace: async (sessionId, faceImage) => {
    const formData = new FormData();
    formData.append('faceImage', faceImage);
    
    const response = await api.post(`/proctoring/sessions/${sessionId}/verify-face`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data.data;
  },
  
  getSessionLogs: async (sessionId) => {
    const response = await api.get(`/proctoring/sessions/${sessionId}/logs`);
    return response.data.data;
  },
  
  getExamSessions: async (examId) => {
    const response = await api.get(`/proctoring/exams/${examId}/sessions`);
    return response.data.data;
  },
  
  // Socket.io methods
  joinExamSession: (sessionId) => {
    socket.emit('join-exam-session', sessionId);
  },
  
  joinProctorRoom: (examId) => {
    socket.emit('join-proctor-room', examId);
  },
  
  onProctoringEvent: (callback) => {
    socket.on('proctoring-event', callback);
    return () => socket.off('proctoring-event', callback);
  }
};

export default {
  exams: examService,
  proctoring: proctoringService,
  socket
};
