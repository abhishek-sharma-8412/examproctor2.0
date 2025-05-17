import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ role, children }) {
  const [allowed, setAllowed] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(
          role === 'student'
            ? 'http://localhost:5000/api/protected/student'
            : 'http://localhost:5000/api/protected/admin',
          { 
            credentials: 'include',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (!response.ok) {
          throw new Error('Authentication failed');
        }
        
        const data = await response.json();
        setAllowed(data.allowed);
        setError(null);
      } catch (err) {
        console.error('Auth check error:', err);
        setError(err.message);
        setAllowed(false);
      }
    };

    checkAuth();
  }, [role]);

  if (allowed === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!allowed) {
    return <Navigate to={role === 'student' ? '/student-login' : '/admin-login'} replace />;
  }

  return children;
}