// src/components/common/Header.jsx
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FiClock } from 'react-icons/fi';

const HeaderContainer = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: var(--card-bg);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 100;
`;

const Logo = styled(motion.div)`
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary);
  display: flex;
  align-items: center;
  gap: 8px;
  
  span {
    background: linear-gradient(90deg, var(--primary), var(--accent));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;

const ExamInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
`;

const Timer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: var(--background);
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 600;
  color: ${props => props.timeLeft < 300 ? 'var(--danger)' : 'var(--text-primary)'};
`;

const Header = ({ examTitle, timeLeft, examMode = false }) => {
  // Format time left in HH:MM:SS
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <HeaderContainer>
      <Logo
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span>ProctorAI</span>
      </Logo>
      
      {examMode && (
        <ExamInfo>
          <motion.h3
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {examTitle || "Exam Title"}
          </motion.h3>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Timer timeLeft={timeLeft}>
              <FiClock size={18} />
              {formatTime(timeLeft)}
            </Timer>
          </motion.div>
        </ExamInfo>
      )}
    </HeaderContainer>
  );
};

export default Header;
