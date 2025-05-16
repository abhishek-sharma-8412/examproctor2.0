// src/components/exam/QuestionCard.jsx
import { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import Card from '../common/Card';

const QuestionContainer = styled(Card)`
  margin-bottom: 20px;
`;

const QuestionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const QuestionNumber = styled.span`
  background-color: var(--primary);
  color: white;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-right: 10px;
`;

const QuestionText = styled.div`
  font-size: 1.1rem;
  margin-bottom: 20px;
  
  p {
    margin-bottom: 10px;
  }
  
  pre {
    background-color: var(--background);
    padding: 12px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 10px 0;
  }
  
  img {
    max-width: 100%;
    border-radius: 6px;
    margin: 10px 0;
  }
`;

const OptionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const OptionLabel = styled.label`
  display: flex;
  align-items: flex-start;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: var(--background);
  }
  
  &.selected {
    border-color: var(--primary);
    background-color: rgba(67, 97, 238, 0.05);
  }
`;

const RadioInput = styled.input`
  margin-right: 12px;
  margin-top: 3px;
`;

const OptionText = styled.span`
  flex: 1;
`;

const QuestionCard = ({ question, number, onAnswerChange }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  
  const handleOptionChange = (optionId) => {
    setSelectedOption(optionId);
    if (onAnswerChange) {
      onAnswerChange(question.id, optionId);
    }
  };
  
  return (
    <QuestionContainer>
      <QuestionHeader>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <QuestionNumber>{number}</QuestionNumber>
          <h3>Question {number}</h3>
        </div>
        <div>{question.points || 1} {question.points === 1 ? 'point' : 'points'}</div>
      </QuestionHeader>
      
      <QuestionText dangerouslySetInnerHTML={{ __html: question.text }} />
      
      <OptionsContainer>
        {question.options.map((option) => (
          <motion.div
            key={option.id}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <OptionLabel className={selectedOption === option.id ? 'selected' : ''}>
              <RadioInput
                type="radio"
                name={`question-${question.id}`}
                checked={selectedOption === option.id}
                onChange={() => handleOptionChange(option.id)}
              />
              <OptionText dangerouslySetInnerHTML={{ __html: option.text }} />
            </OptionLabel>
          </motion.div>
        ))}
      </OptionsContainer>
    </QuestionContainer>
  );
};

export default QuestionCard;
