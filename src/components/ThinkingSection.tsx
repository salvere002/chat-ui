import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import ThinkingIndicator from './ThinkingIndicator';

interface ThinkingSectionProps {
  thinkingContent?: string;
  isThinkingComplete?: boolean;
  isStreaming: boolean;
  initialCollapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
}

const ThinkingSection: React.FC<ThinkingSectionProps> = ({
  thinkingContent,
  isThinkingComplete = false,
  isStreaming,
  initialCollapsed = true,
  onToggle
}) => {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [displayContent, setDisplayContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Update display content when thinking content changes
  useEffect(() => {
    if (thinkingContent) {
      setDisplayContent(thinkingContent);
    }
  }, [thinkingContent]);

  // Auto-scroll to bottom when streaming and expanded
  useEffect(() => {
    if (!isCollapsed && isStreaming && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayContent, isCollapsed, isStreaming]);

  const handleToggle = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onToggle?.(newCollapsed);
  };

  // Don't render if no thinking content
  if (!thinkingContent && !isStreaming) {
    return null;
  }

  // Get preview text for collapsed view (last 50 characters)
  const previewText = displayContent 
    ? displayContent.slice(-50).replace(/^\s+/, '') 
    : '';

  return (
    <div className="mb-3 border border-border-primary rounded-lg overflow-hidden">
      {/* Header with toggle */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-3 bg-bg-secondary hover:bg-bg-tertiary transition-colors"
      >
        <div className="flex items-center space-x-2">
          {isCollapsed ? (
            <ChevronRightIcon className="w-4 h-4 text-text-tertiary" />
          ) : (
            <ChevronDownIcon className="w-4 h-4 text-text-tertiary" />
          )}
          <ThinkingIndicator isStreaming={isStreaming && !isThinkingComplete} />
        </div>
        
        {/* Preview text when collapsed and streaming */}
        {isCollapsed && isStreaming && previewText && (
          <div className="flex-1 mx-3 overflow-hidden">
            <div className="text-xs text-text-tertiary truncate text-right">
              ...{previewText}
            </div>
          </div>
        )}
      </button>

      {/* Expandable content */}
      {!isCollapsed && (
        <div 
          ref={scrollRef}
          className="p-3 bg-bg-primary max-h-64 overflow-y-auto border-t border-border-primary"
        >
          <div className="text-sm text-text-secondary whitespace-pre-wrap font-mono">
            {displayContent || (isStreaming ? 'Starting to think...' : '')}
            {isStreaming && !isThinkingComplete && (
              <span className="inline-block w-2 h-4 bg-text-tertiary ml-1 animate-pulse"></span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThinkingSection;