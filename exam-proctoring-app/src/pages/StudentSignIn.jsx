// filepath: exam-proctoring-app/src/pages/StudentSignIn.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function StudentSignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('http://localhost:5000/api/register/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      if (res.ok) {
        navigate('/student-login');
      } else {
        setError('User already exists or error occurred');
      }
    } catch {
      setError('Server error');
    }
  };

  return (
    <div className="exam-interface-container">
      <h2>Student Sign In</h2>
      <form onSubmit={handleSignIn}>
        <input type="text" placeholder="Name" value={name}
          onChange={e => setName(e.target.value)} required />
        <input type="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password}
          onChange={e => setPassword(e.target.value)} required />
        <button type="submit">Sign In</button>
        {error && <p style={{color:'red'}}>{error}</p>}
      </form>
      <button onClick={() => navigate('/student-login')}>
        Already have an account? Login
      </button>
    </div>
  );
}