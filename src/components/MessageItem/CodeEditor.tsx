import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { FaTimes, FaSave, FaUndo, FaCopy, FaCheck } from 'react-icons/fa';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import copyToClipboard from 'copy-to-clipboard';

interface CodeEditorProps {
  code: string;
  language: string;
  onSave: (newCode: string) => void;
  onClose: () => void;
}

const CodeEditor = memo<CodeEditorProps>(({ code, language, onSave, onClose }) => {
  const [editedCode, setEditedCode] = useState(code);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const syntaxHighlighterRef = useRef<HTMLDivElement>(null);

  // Sync scroll between textarea, line numbers, and syntax highlighter
  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current && syntaxHighlighterRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
      syntaxHighlighterRef.current.scrollTop = textareaRef.current.scrollTop;
      syntaxHighlighterRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, []);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, editedCode]);

  const handleSave = () => {
    onSave(editedCode);
    onClose();
  };

  const handleReset = () => {
    setEditedCode(code);
  };

  const handleCopy = () => {
    const ok = copyToClipboard(editedCode);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  // Handle tab key for indentation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      // Insert tab at cursor position
      const newValue = editedCode.substring(0, start) + '  ' + editedCode.substring(end);
      setEditedCode(newValue);
      
      // Move cursor after the inserted tab
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  };

  const lines = editedCode.split('\n');
  const lineCount = lines.length;
  const hasChanges = editedCode !== code;

  // Theme-agnostic syntax highlighting style
  const syntaxTheme = {
    'pre[class*="language-"]': {
      color: 'var(--code-fg)',
      fontSize: '14px',
      fontFamily: 'var(--font-mono)',
      lineHeight: '1.6',
      padding: '1rem',
      margin: 0,
      background: 'transparent',
      whiteSpace: 'pre',
      wordSpacing: 'normal',
      wordBreak: 'normal',
      tabSize: 2,
    },
    'code[class*="language-"]': {
      color: 'var(--code-fg)',
      fontSize: '14px',
      fontFamily: 'var(--font-mono)',
    },
    comment: { color: 'var(--code-token-comment)' },
    punctuation: { color: 'var(--code-token-punctuation)' },
    property: { color: 'var(--code-token-property)' },
    tag: { color: 'var(--code-token-tag)' },
    boolean: { color: 'var(--code-token-boolean)' },
    number: { color: 'var(--code-token-number)' },
    string: { color: 'var(--code-token-string)' },
    operator: { color: 'var(--code-token-operator)' },
    keyword: { color: 'var(--code-token-keyword)' },
    function: { color: 'var(--code-token-function)' },
    'class-name': { color: 'var(--code-token-class-name)' },
    variable: { color: 'var(--code-token-variable)' },
  } as any;

  return (
    <div className="fixed inset-0 z-modal bg-bg-primary flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-secondary bg-bg-secondary">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-text-primary">Code Editor</span>
          <span className="px-2 py-0.5 text-xs font-medium text-text-tertiary bg-bg-tertiary rounded uppercase">
            {language}
          </span>
          <span className="text-xs text-text-tertiary">
            {lineCount} {lineCount === 1 ? 'line' : 'lines'}
          </span>
          {hasChanges && (
            <span className="px-2 py-0.5 text-xs font-medium text-warning bg-warning/10 rounded">
              Unsaved changes
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors"
            title="Copy code"
          >
            {copied ? (
              <>
                <FaCheck className="text-success text-xs" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <FaCopy className="text-xs" />
                <span>Copy</span>
              </>
            )}
          </button>
          
          {/* Reset button */}
          <button
            onClick={handleReset}
            disabled={!hasChanges}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Reset changes"
          >
            <FaUndo className="text-xs" />
            <span>Reset</span>
          </button>
          
          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-inverse bg-accent-primary hover:bg-accent-hover rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Save changes (⌘S)"
          >
            <FaSave className="text-xs" />
            <span>Save</span>
          </button>
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors ml-2"
            title="Close (Esc)"
          >
            <FaTimes />
          </button>
        </div>
      </div>
      
      {/* Editor area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Line numbers */}
        <div
          ref={lineNumbersRef}
          className="flex-shrink-0 py-4 px-3 bg-bg-secondary border-r border-border-secondary overflow-hidden select-none"
          style={{ minWidth: '50px' }}
        >
          {lines.map((_, index) => (
            <div
              key={index}
              className="text-right text-xs text-text-tertiary leading-[1.6] font-mono"
              style={{ height: '22.4px' }}
            >
              {index + 1}
            </div>
          ))}
        </div>
        
        {/* Code editor with overlay */}
        <div className="flex-1 relative overflow-hidden">
          {/* Syntax highlighted preview (behind) */}
          <div 
            ref={syntaxHighlighterRef}
            className="absolute inset-0 overflow-auto pointer-events-none"
          >
            <SyntaxHighlighter
              style={syntaxTheme}
              language={language}
              PreTag="div"
              customStyle={{
                margin: 0,
                padding: '1rem',
                background: 'transparent',
                minHeight: '100%',
              }}
            >
              {editedCode}
            </SyntaxHighlighter>
          </div>
          
          {/* Transparent textarea (on top) */}
          <textarea
            ref={textareaRef}
            value={editedCode}
            onChange={(e) => setEditedCode(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            className="absolute inset-0 w-full h-full resize-none bg-transparent text-transparent caret-text-primary outline-none p-4 font-mono text-sm leading-[1.6] overflow-auto"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '14px',
              lineHeight: '1.6',
              tabSize: 2,
            }}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
        </div>
      </div>
      
      {/* Footer with keyboard shortcuts */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border-secondary bg-bg-secondary text-xs text-text-tertiary">
        <div className="flex items-center gap-4">
          <span>
            <kbd className="px-1.5 py-0.5 bg-bg-tertiary rounded text-text-secondary">Esc</kbd> Close
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-bg-tertiary rounded text-text-secondary">⌘S</kbd> Save
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-bg-tertiary rounded text-text-secondary">Tab</kbd> Indent
          </span>
        </div>
        <div>
          Cursor: Line {lines.length}, Col {(lines[lines.length - 1]?.length || 0) + 1}
        </div>
      </div>
    </div>
  );
});

CodeEditor.displayName = 'CodeEditor';

export default CodeEditor;

