import { memo } from 'react';
import { FaRedo, FaEdit, FaCopy, FaShareAlt } from 'react-icons/fa';

interface MessageActionsProps {
  sender: 'user' | 'ai';
  text?: string;
  copied: boolean;
  isEditing: boolean;
  isComplete?: boolean;
  onCopyMessage: () => void;
  onSetIsEditing: (editing: boolean) => void;
  onEditMessage?: (messageId: string, newText: string) => void;
  onRegenerateResponse?: () => void;
  onMessagePairCapture?: () => void;
}

const MessageActions = memo<MessageActionsProps>(({ 
  sender, 
  text, 
  copied, 
  isEditing, 
  isComplete,
  onCopyMessage, 
  onSetIsEditing, 
  onEditMessage, 
  onRegenerateResponse,
  onMessagePairCapture 
}) => {
  return (
    <div className="flex gap-1 items-center">
      {/* Copy button for all messages with text */}
      {text && (
        <button 
          className={`flex items-center justify-center w-7 h-7 p-0 bg-transparent border-none rounded-md text-text-tertiary cursor-pointer transition-all duration-150 relative overflow-hidden hover:text-accent-primary active:scale-90 ${copied ? 'text-success' : ''}`}
          onClick={onCopyMessage}
          title={copied ? "Copied" : "Copy text"}
        >
          {copied ? <span className="absolute inset-0 flex items-center justify-center text-base animate-check-mark">✓</span> : <FaCopy className="relative z-10 text-sm" />}
        </button>
      )}
      
      {/* Share button for AI messages */}
      {sender === 'ai' && isComplete !== false && onMessagePairCapture && (
        <button 
          className="flex items-center justify-center w-7 h-7 p-0 bg-transparent border-none rounded-md text-text-tertiary cursor-pointer transition-all duration-150 relative overflow-hidden hover:text-accent-primary active:scale-90"
          onClick={onMessagePairCapture}
          title="Share this message pair"
        >
          <FaShareAlt className="relative z-10 text-sm" />
        </button>
      )}
      
      {/* For user messages: Create Branch button (replacing edit) */}
      {sender === 'user' && isComplete !== false && onEditMessage && !isEditing && (
        <button 
          className="flex items-center justify-center w-7 h-7 p-0 bg-transparent border-none rounded-md text-text-tertiary cursor-pointer transition-all duration-150 relative overflow-hidden hover:text-accent-primary active:scale-90"
          onClick={() => onSetIsEditing(true)}
          title="Create new branch"
        >
          <FaEdit className="relative z-10 text-sm" />
        </button>
      )}
      
      {/* Regenerate button for user messages */}
      {sender === 'user' && isComplete !== false && onRegenerateResponse && (
        <button 
          className="flex items-center justify-center w-7 h-7 p-0 bg-transparent border-none rounded-md text-text-tertiary cursor-pointer transition-all duration-150 relative overflow-hidden hover:text-accent-primary active:scale-90"
          onClick={onRegenerateResponse}
          title="Regenerate response"
        >
          <FaRedo className="relative z-10 text-sm" />
        </button>
      )}
    </div>
  );
});

MessageActions.displayName = 'MessageActions';

export default MessageActions;