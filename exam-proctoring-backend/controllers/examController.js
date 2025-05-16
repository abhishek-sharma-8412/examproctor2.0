// controllers/examController.js
const supabase = require('../config/supabase');
const faceDetectionService = require('../services/faceDetectionService');
const fs = require('fs');
const path = require('path');

// Get all exams
exports.getExams = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get exam by ID with questions and options
exports.getExamById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get exam
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('*')
      .eq('id', id)
      .single();
    
    if (examError) throw examError;
    
    // Get questions for this exam
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('exam_id', id)
      .order('created_at', { ascending: true });
    
    if (questionsError) throw questionsError;
    
    // Get options for these questions
    const questionIds = questions.map(q => q.id);
    
    const { data: options, error: optionsError } = await supabase
      .from('options')
      .select('*')
      .in('question_id', questionIds);
    
    if (optionsError) throw optionsError;
    
    // Group options by question
    const questionsWithOptions = questions.map(question => {
      const questionOptions = options.filter(option => option.question_id === question.id);
      return {
        ...question,
        options: questionOptions.map(option => ({
          id: option.id,
          text: option.text,
          // Only include is_correct for proctors
          ...(req.query.role === 'proctor' && { is_correct: option.is_correct })
        }))
      };
    });
    
    res.status(200).json({
      success: true,
      data: {
        ...exam,
        questions: questionsWithOptions
      }
    });
  } catch (error) {
    console.error('Get exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Start an exam session
exports.startExamSession = async (req, res) => {
  try {
    const { examId, studentName, studentEmail } = req.body;
    
    // Create a new session
    const { data, error } = await supabase
      .from('exam_sessions')
      .insert({
        exam_id: examId,
        student_name: studentName,
        student_email: studentEmail,
        status: 'in_progress'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Notify proctors about the new session
    req.io.to(`proctor:${examId}`).emit('session-started', {
      sessionId: data.id,
      studentName,
      examId,
      startTime: data.start_time
    });
    
    res.status(201).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Start exam session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Register student's face for an exam session
exports.registerFace = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No face image provided'
      });
    }
    
    // Detect faces in the image
    const imageBuffer = fs.readFileSync(req.file.path);
    const faceDetection = await faceDetectionService.detectFaces(imageBuffer);
    
    if (faceDetection.faceCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'No face detected in the image'
      });
    }
    
    if (faceDetection.faceCount > 1) {
      return res.status(400).json({
        success: false,
        message: 'Multiple faces detected in the image'
      });
    }
    
    // Update session with face image URL
    const imageUrl = `/uploads/${req.file.filename}`;
    
    const { data, error } = await supabase
      .from('exam_sessions')
      .update({
        face_image_url: imageUrl
      })
      .eq('id', sessionId)
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(200).json({
      success: true,
      data: {
        sessionId,
        faceImageUrl: imageUrl
      }
    });
  } catch (error) {
    console.error('Register face error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Submit an answer
exports.submitAnswer = async (req, res) => {
  try {
    const { sessionId, questionId, optionId } = req.body;
    
    // Check if an answer already exists
    const { data: existingAnswer, error: checkError } = await supabase
      .from('student_answers')
      .select('*')
      .eq('session_id', sessionId)
      .eq('question_id', questionId)
      .single();
    
    if (existingAnswer) {
      // Update existing answer
      const { data, error } = await supabase
        .from('student_answers')
        .update({
          selected_option_id: optionId
        })
        .eq('id', existingAnswer.id)
        .select()
        .single();
      
      if (error) throw error;
      
      return res.status(200).json({
        success: true,
        data
      });
    }
    
    // Create new answer
    const { data, error } = await supabase
      .from('student_answers')
      .insert({
        session_id: sessionId,
        question_id: questionId,
        selected_option_id: optionId
      })
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Submit the entire exam
exports.submitExam = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Get the session
    const { data: session, error: sessionError } = await supabase
      .from('exam_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (sessionError) throw sessionError;
    
    // Get all answers for this session
    const { data: answers, error: answersError } = await supabase
      .from('student_answers')
      .select(`
        *,
        question:questions(*),
        selected_option:options(*)
      `)
      .eq('session_id', sessionId);
    
    if (answersError) throw answersError;
    
    // Calculate score
    let score = 0;
    let totalPoints = 0;
    
    for (const answer of answers) {
      totalPoints += answer.question.points;
      
      if (answer.selected_option.is_correct) {
        score += answer.question.points;
      }
    }
    
    // Update session
    const { data, error } = await supabase
      .from('exam_sessions')
      .update({
        status: 'completed',
        end_time: new Date(),
        score
      })
      .eq('id', sessionId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Notify about exam completion
    req.io.to(`proctor:${session.exam_id}`).emit('exam-completed', {
      sessionId,
      studentName: session.student_name,
      examId: session.exam_id,
      score,
      totalPoints
    });
    
    res.status(200).json({
      success: true,
      data: {
        ...data,
        score,
        totalPoints,
        percentage: Math.round((score / totalPoints) * 100)
      }
    });
  } catch (error) {
    console.error('Submit exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get exam results
exports.getExamResults = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Get the session
    const { data: session, error: sessionError } = await supabase
      .from('exam_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (sessionError) throw sessionError;
    
    // Get the exam
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('*')
      .eq('id', session.exam_id)
      .single();
      
    if (examError) throw examError;
    
    // Get all questions for this exam
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select(`
        *,
        options(*)
      `)
      .eq('exam_id', session.exam_id)
      .order('created_at', { ascending: true });
    
    if (questionsError) throw questionsError;
    
    // Get all answers for this session
    const { data: answers, error: answersError } = await supabase
      .from('student_answers')
      .select(`
        *,
        selected_option:options(*)
      `)
      .eq('session_id', sessionId);
    
    if (answersError) throw answersError;
    
    // Combine questions with answers
    const questionsWithAnswers = questions.map(question => {
      const answer = answers.find(a => a.question_id === question.id);
      const correctOption = question.options.find(o => o.is_correct);
      
      return {
        ...question,
        studentAnswer: answer ? {
          selectedOptionId: answer.selected_option_id,
          isCorrect: answer.selected_option.is_correct
        } : null,
        correctOptionId: correctOption ? correctOption.id : null
      };
    });
    
    // Calculate score
    let score = 0;
    let totalPoints = 0;
    
    for (const question of questionsWithAnswers) {
      totalPoints += question.points;
      
      if (question.studentAnswer && question.studentAnswer.isCorrect) {
        score += question.points;
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        session: {
          ...session,
          exam,
          score: session.score || score
        },
        questions: questionsWithAnswers,
        score,
        totalPoints,
        percentage: Math.round((score / totalPoints) * 100)
      }
    });
  } catch (error) {
    console.error('Get exam results error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Create a sample exam
exports.createSampleExam = async (req, res) => {
  try {
    // Create exam
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .insert({
        title: 'Advanced Computer Science',
        description: 'Final exam for Computer Science course',
        duration: 7200, // 2 hours in seconds
      })
      .select()
      .single();
    
    if (examError) throw examError;
    
    // Sample questions and options
    const questionsData = [
      {
        text: 'What is the time complexity of quicksort in the worst case?',
        points: 2,
        options: [
          { text: 'O(n)', is_correct: false },
          { text: 'O(n log n)', is_correct: false },
          { text: 'O(n²)', is_correct: true },
          { text: 'O(n!)', is_correct: false }
        ]
      },
      {
        text: 'Which of the following is NOT a React Hook?',
        points: 1,
        options: [
          { text: 'useEffect', is_correct: false },
          { text: 'useState', is_correct: false },
          { text: 'useHistory', is_correct: true },
          { text: 'useCallback', is_correct: false }
        ]
      },
      {
        text: 'What does the following code output?<pre>const arr = [1, 2, 3, 4, 5];\nconst result = arr.filter(num => num % 2 === 0).map(num => num * 2);\nconsole.log(result);</pre>',
        points: 3,
        options: [
          { text: '[2, 4, 6, 8, 10]', is_correct: false },
          { text: '[4, 8]', is_correct: true },
          { text: '[2, 4]', is_correct: false },
          { text: '[1, 3, 5]', is_correct: false }
        ]
      },
      {
        text: 'Which data structure would be most efficient for implementing a priority queue?',
        points: 2,
        options: [
          { text: 'Array', is_correct: false },
          { text: 'Linked List', is_correct: false },
          { text: 'Binary Search Tree', is_correct: false },
          { text: 'Heap', is_correct: true }
        ]
      },
      {
        text: 'What is the output of this Python code?<pre>def func(x, y=[]):\n    y.append(x)\n    return y\n\nprint(func(1))\nprint(func(2))\nprint(func(3, []))</pre>',
        points: 3,
        options: [
          { text: '[1], [2], [3]', is_correct: false },
          { text: '[1], [1, 2], [3]', is_correct: true },
          { text: '[1], [2], [1, 2, 3]', is_correct: false },
          { text: '[1, 2, 3], [1, 2, 3], [3]', is_correct: false }
        ]
      }
    ];
    
    // Insert questions and options
    for (const questionData of questionsData) {
      // Insert question
      const { data: question, error: questionError } = await supabase
        .from('questions')
        .insert({
          exam_id: exam.id,
          text: questionData.text,
          points: questionData.points
        })
        .select()
        .single();
      
      if (questionError) throw questionError;
      
      // Insert options for this question
      for (const optionData of questionData.options) {
        const { error: optionError } = await supabase
          .from('options')
          .insert({
            question_id: question.id,
            text: optionData.text,
            is_correct: optionData.is_correct
          });
        
        if (optionError) throw optionError;
      }
    }
    
    res.status(201).json({
      success: true,
      data: exam
    });
  } catch (error) {
    console.error('Create sample exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
