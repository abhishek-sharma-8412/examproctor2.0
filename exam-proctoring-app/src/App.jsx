// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import StudentLogin from './pages/StudentLogin';
import StudentSignIn from './pages/StudentSignIn';
import AdminLogin from './pages/AdminLogin';
import AdminSignIn from './pages/AdminSignIn';
import GlobalStyles from './styles/GlobalStyles';
import ExamInterface from './components/exam/ExamInterface';
import ProctorDashboard from './components/dashboard/ProctorDashboard';
import ProtectedRoute from './components/ProtectedRoute';
function App() {
  return (
    <Router>
      <GlobalStyles />
         <Routes>
        <Route path="/student-login" element={<StudentLogin />} />
        <Route path="/student-signin" element={<StudentSignIn />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin-signin" element={<AdminSignIn />} />
        <Route
          path="/exam"
          element={
            <ProtectedRoute role="student">
              <ExamInterface />
            </ProtectedRoute>
          }
        />
        <Route
          path="/proctor"
          element={
            <ProtectedRoute role="admin">
              <ProctorDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/student-login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
