import React from 'react';
import './LoadingIndicator.css';

interface LoadingIndicatorProps {
  size?: 'small' | 'medium' | 'large';
  type?: 'spinner' | 'dots' | 'pulse';
  text?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  size = 'medium', 
  type = 'spinner',
  text
}) => {
  return (
    <div className={`loading-indicator ${size} ${type}`}>
      {type === 'spinner' && (
        <div className="spinner"></div>
      )}
      
      {type === 'dots' && (
        <div className="dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      )}
      
      {type === 'pulse' && (
        <div className="pulse"></div>
      )}
      
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
};

export default LoadingIndicator; 