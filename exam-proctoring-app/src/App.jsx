// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import GlobalStyles from './styles/GlobalStyles';
import ExamInterface from './components/exam/ExamInterface';
import ProctorDashboard from './components/dashboard/ProctorDashboard';

function App() {
  return (
    <Router>
      <GlobalStyles />
      <Routes>
        <Route path="/exam" element={<ExamInterface />} />
        <Route path="/proctor" element={<ProctorDashboard />} />
        <Route path="/" element={<Navigate to="/exam" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
