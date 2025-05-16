// src/components/common/Button.jsx
import styled from 'styled-components';
import { motion } from 'framer-motion';

const StyledButton = styled(motion.button)`
  background: ${props => props.variant === 'primary' ? 'var(--primary)' : 
               props.variant === 'secondary' ? 'var(--secondary)' : 
               props.variant === 'danger' ? 'var(--danger)' : 'var(--primary)'};
  color: white;
  border: none;
  border-radius: 8px;
  padding: ${props => props.size === 'large' ? '14px 28px' : 
              props.size === 'small' ? '6px 12px' : '10px 20px'};
  font-size: ${props => props.size === 'large' ? '1.1rem' : 
               props.size === 'small' ? '0.9rem' : '1rem'};
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'medium', 
  icon, 
  onClick, 
  disabled = false,
  ...props 
}) => {
  return (
    <StyledButton
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      {...props}
    >
      {icon && icon}
      {children}
    </StyledButton>
  );
};

export default Button;
