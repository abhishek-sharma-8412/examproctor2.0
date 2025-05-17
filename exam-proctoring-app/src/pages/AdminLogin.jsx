import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('http://localhost:5000/api/login/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        navigate('/proctor');
      } else {
        setError('Invalid credentials');
      }
    } catch {
      setError('Server error');
    }
  };

  return (
    <div className="exam-interface-container">
      <h2>Admin Login</h2>
      <form onSubmit={handleLogin}>
        <input type="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password}
          onChange={e => setPassword(e.target.value)} required />
        <button type="submit">Login</button>
        {error && <p style={{color:'red'}}>{error}</p>}
      </form>
      <button onClick={() => navigate('/admin-signin')}>
        New user? Sign in
      </button>
    </div>
  );
}