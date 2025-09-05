import React from 'react';

interface SuggestedQuestionsProps {
  suggestions: string[];
  isLoading?: boolean;
  onSuggestionClick: (suggestion: string) => void;
}

const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({
  suggestions,
  isLoading = false,
  onSuggestionClick
}) => {
  if (isLoading) {
    return (
      <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-thin scrollbar-thumb-border-secondary scrollbar-track-transparent scroll-pl-4 scroll-pr-4 animate-fade-in">
        <div className="flex gap-2 mx-auto">
          {[1, 2, 3].map((index) => (
            <div
              key={index}
              className="flex-shrink-0 px-4 py-2 bg-bg-elevated border border-border-secondary rounded-full animate-pulse"
            >
              <div className="h-4 w-20 bg-border-secondary rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-thin scrollbar-thumb-border-secondary scrollbar-track-transparent scroll-pl-4 scroll-pr-4 animate-fade-in">
      <div className="flex gap-2 mx-auto">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionClick(suggestion)}
            className="flex-shrink-0 px-4 py-2 bg-bg-elevated border border-border-secondary rounded-full text-sm text-text-secondary hover:text-text-primary hover:border-accent-primary hover:bg-bg-elevated transition-all duration-200 hover:scale-105 active:scale-95 whitespace-nowrap shadow-sm hover:shadow-md"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SuggestedQuestions;