import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminSignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('http://localhost:5000/api/register/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      if (res.ok) {
        navigate('/admin-login');
      } else {
        setError('User already exists or error occurred');
      }
    } catch {
      setError('Server error');
    }
  };

  return (
    <div className="exam-interface-container">
      <h2>Admin Sign In</h2>
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
      <button onClick={() => navigate('/admin-login')}>
        Already have an account? Login
      </button>
    </div>
  );
}