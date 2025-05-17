import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FiUser, FiLock, FiUserPlus, FiMail } from 'react-icons/fi';

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--background);
  padding: 2rem;
`;

const SignUpCard = styled(motion.div)`
  background: white;
  padding: 2.5rem;
  border-radius: 16px;
  box-shadow: var(--shadow);
  width: 100%;
  max-width: 400px;
`;

const Title = styled.h2`
  color: var(--text-primary);
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 2rem;
  text-align: center;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const InputGroup = styled.div`
  position: relative;
  
  svg {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-secondary);
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 1rem 1rem 1rem 3rem;
  border: 2px solid var(--border);
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.1);
  }
`;

const Button = styled.button`
  background-color: var(--primary);
  color: white;
  padding: 1rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s;
  
  &:hover {
    background-color: var(--primary-dark);
    transform: translateY(-1px);
  }
  
  &:disabled {
    background-color: var(--text-secondary);
    cursor: not-allowed;
  }
`;

const LoginButton = styled(Button)`
  background-color: transparent;
  color: var(--primary);
  border: 2px solid var(--primary);
  margin-top: 1rem;
  
  &:hover {
    background-color: rgba(67, 97, 238, 0.1);
  }
`;

const ErrorMessage = styled.p`
  color: var(--danger);
  font-size: 0.9rem;
  text-align: center;
  margin-top: 1rem;
`;

export default function AdminSignIn() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const res = await fetch('http://localhost:5000/api/signup/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password }),
      });
      
      if (res.ok) {
        navigate('/admin-login');
      } else {
        const data = await res.json();
        setError(data.error || 'Error creating account');
      }
    } catch (err) {
      setError('Server error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <SignUpCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Title>Admin Sign Up</Title>
        <Form onSubmit={handleSignUp}>
          <InputGroup>
            <FiUser />
            <Input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </InputGroup>
          <InputGroup>
            <FiMail />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </InputGroup>
          <InputGroup>
            <FiLock />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </InputGroup>
          <Button type="submit" disabled={isLoading}>
            <FiUserPlus />
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </Button>
          {error && <ErrorMessage>{error}</ErrorMessage>}
        </Form>
        <LoginButton onClick={() => navigate('/admin-login')}>
          Already have an account? Login
        </LoginButton>
      </SignUpCard>
    </Container>
  );
}