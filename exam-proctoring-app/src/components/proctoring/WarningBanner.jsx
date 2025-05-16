// src/components/proctoring/WarningBanner.jsx
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertTriangle } from 'react-icons/fi';

const Banner = styled(motion.div)`
  background-color: var(--danger);
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 4px 12px rgba(230, 57, 70, 0.3);
`;

const WarningIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const WarningMessage = styled.div`
  flex: 1;
  font-weight: 500;
`;

const WarningAction = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const WarningBanner = ({ 
  visible, 
  message, 
  actionText = "Resolve", 
  onAction 
}) => {
  return (
    <AnimatePresence>
      {visible && (
        <Banner
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <WarningIcon>
            <FiAlertTriangle size={24} />
          </WarningIcon>
          <WarningMessage>{message}</WarningMessage>
          {onAction && (
            <WarningAction onClick={onAction}>
              {actionText}
            </WarningAction>
          )}
        </Banner>
      )}
    </AnimatePresence>
  );
};

export default WarningBanner;
