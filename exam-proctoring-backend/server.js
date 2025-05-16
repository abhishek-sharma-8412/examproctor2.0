// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const examRoutes = require('./routes/examRoutes');
const proctoringRoutes = require('./routes/proctoringRoutes');

// Initialize express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Make io available to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Static folder for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Use routes
app.use('/api/exams', examRoutes);
app.use('/api/proctoring', proctoringRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('Exam Proctoring API is running');
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('join-exam-session', (sessionId) => {
    socket.join(sessionId);
    console.log(`Client joined exam session: ${sessionId}`);
  });
  
  socket.on('join-proctor-room', (examId) => {
    socket.join(`proctor:${examId}`);
    console.log(`Proctor joined room for exam: ${examId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
