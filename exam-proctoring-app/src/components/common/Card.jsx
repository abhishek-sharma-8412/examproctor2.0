// src/components/common/Card.jsx
import styled from 'styled-components';
import { motion } from 'framer-motion';

const StyledCard = styled(motion.div)`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: ${props => props.padding || '20px'};
  box-shadow: var(--shadow);
  width: ${props => props.width || '100%'};
  height: ${props => props.height || 'auto'};
  overflow: hidden;
`;

const Card = ({ 
  children, 
  width, 
  height, 
  padding,
  animate = true,
  ...props 
}) => {
  return (
    <StyledCard
      width={width}
      height={height}
      padding={padding}
      initial={animate ? { opacity: 0, y: 20 } : undefined}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      transition={animate ? { duration: 0.5 } : undefined}
      {...props}
    >
      {children}
    </StyledCard>
  );
};

export default Card;
