import React, { useMemo } from 'react';
import { useThemeStore } from '../stores';

interface ExpressionRendererProps {
  code: string;
  className?: string;
}

const ExpressionRenderer: React.FC<ExpressionRendererProps> = ({ code, className }) => {
  const { theme } = useThemeStore();
  
  // Memoize the expression data to prevent unnecessary re-renders
  const memoizedExpressionData = useMemo(() => {
    if (!code || !code.trim()) {
      return null;
    }
    
    const trimmedCode = code.trim();
    return {
      url: `https://your-domain.com/expression/${trimmedCode}`,
      key: `expression-${trimmedCode}`,
      code: trimmedCode
    };
  }, [code]);

  // If no valid code, show error state
  if (!memoizedExpressionData) {
    return (
      <div className="p-4 bg-bg-secondary border border-border-secondary rounded-lg text-center">
        <p className="text-text-secondary">No expression code provided</p>
        <p className="text-xs text-text-tertiary mt-1">Expected format: expression{code}</p>
      </div>
    );
  }

  const { url, key, code: expressionCode } = memoizedExpressionData;

  return (
    <div className={`expression-container my-4 w-full ${className || ''}`} style={{ maxWidth: '100%' }}>
      <div 
        className="w-full bg-bg-secondary rounded-lg border border-border-secondary" 
        style={{ 
          height: '320px',
          minHeight: '320px',
          maxWidth: '760px',
          margin: '0 auto',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%'
        }}>
          <iframe
            key={key}
            src={url}
            width="580"
            height="320"
            frameBorder="0"
            loading="lazy"
            sandbox="allow-scripts allow-same-origin"
            title={`Expression ${expressionCode}`}
            style={{
              border: 'none',
              borderRadius: '0.5rem',
              backgroundColor: theme === 'dark' ? 'var(--color-bg-primary)' : '#ffffff'
            }}
            onLoad={() => {
              console.log(`Expression ${expressionCode} loaded successfully`);
            }}
            onError={() => {
              console.warn(`Failed to load expression: ${expressionCode}`);
            }}
          />
        </div>
      </div>
      
      {/* Optional: Show expression code below for reference */}
      <div className="text-center mt-2">
        <span className="text-xs text-text-tertiary font-mono">
          {expressionCode}
        </span>
      </div>
    </div>
  );
};

export default React.memo(ExpressionRenderer, (prevProps, nextProps) => {
  // Only re-render if code or className actually changed
  return (
    prevProps.code === nextProps.code &&
    prevProps.className === nextProps.className
  );
});