import React from 'react';

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
    <div className={`flex flex-col items-center justify-center gap-2 ${
      size === 'small' ? '[--indicator-size:16px] [--dot-size:4px] text-xs' :
      size === 'large' ? '[--indicator-size:32px] [--dot-size:8px] text-base' :
      '[--indicator-size:24px] [--dot-size:6px] text-sm'
    }`}>
      {type === 'spinner' && (
        <div className="w-[var(--indicator-size)] h-[var(--indicator-size)] border-2 border-border-secondary border-t-accent-primary rounded-full animate-spin origin-center" />
      )}
      
      {type === 'dots' && (
        <div className="flex items-center gap-[calc(var(--dot-size)*0.5)]">
          <span className="w-[var(--dot-size)] h-[var(--dot-size)] bg-accent-primary rounded-full animate-pulse-dot opacity-30" />
          <span className="w-[var(--dot-size)] h-[var(--dot-size)] bg-accent-primary rounded-full animate-pulse-dot opacity-30" style={{animationDelay: '0.2s'}} />
          <span className="w-[var(--dot-size)] h-[var(--dot-size)] bg-accent-primary rounded-full animate-pulse-dot opacity-30" style={{animationDelay: '0.4s'}} />
        </div>
      )}
      
      {type === 'pulse' && (
        <div className="w-[var(--indicator-size)] h-[var(--indicator-size)] bg-accent-primary rounded-full animate-pulse" />
      )}
      
      {text && <p className="text-text-secondary m-0 animate-fade-in">{text}</p>}
    </div>
  );
};

export default LoadingIndicator; 