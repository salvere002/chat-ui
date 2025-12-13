import { memo, useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { FaTimes, FaSave, FaUndo, FaCopy, FaCheck, FaPlay } from 'react-icons/fa';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import copyToClipboard from 'copy-to-clipboard';

const REACT_IMPORT_REGEX = /from\s+['"]react['"]|require\(['"]react['"]\)/;
const EXPORT_DEFAULT_REGEX = /export\s+default\s+/;

const isReactModuleCode = (code: string): boolean => {
  if (!REACT_IMPORT_REGEX.test(code)) return false;
  if (!EXPORT_DEFAULT_REGEX.test(code)) return false;
  return true;
};

const loadCodePreview = () => import('./CodePreview');
const CodePreview = lazy(loadCodePreview);

interface CodeEditorProps {
  code: string;
  language: string;
  onSave: (newCode: string) => void;
  onClose: () => void;
}

const CodeEditor = memo<CodeEditorProps>(({ code, language, onSave, onClose }) => {
  const [savedCode, setSavedCode] = useState(code);
  const [editedCode, setEditedCode] = useState(code);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);
  const [scrollTop, setScrollTop] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const syntaxHighlighterRef = useRef<HTMLDivElement>(null);

  // Keep local savedCode in sync with parent prop
  useEffect(() => {
    setSavedCode(code);
    setEditedCode(code);
  }, [code]);

  const updateCursorFromSelection = useCallback((value: string, selectionStart: number | null | undefined) => {
    const pos = typeof selectionStart === 'number' ? selectionStart : 0;
    const beforeCursor = value.slice(0, pos);
    const line = beforeCursor.split('\n').length;
    const lastNewline = beforeCursor.lastIndexOf('\n');
    const col = pos - (lastNewline + 1) + 1;
    setCursorLine(line);
    setCursorCol(col);
  }, []);

  const updateCursorFromTextarea = useCallback(
    (textarea: HTMLTextAreaElement | null) => {
      if (!textarea) return;
      updateCursorFromSelection(textarea.value, textarea.selectionStart);
    },
    [updateCursorFromSelection]
  );

  const canPreview = useMemo(
    () => isReactModuleCode(savedCode),
    [savedCode]
  );

  useEffect(() => {
    if (!canPreview && showPreview) {
      setShowPreview(false);
    }
  }, [canPreview, showPreview]);

  // Sync scroll between textarea, line numbers, and syntax highlighter
  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current && syntaxHighlighterRef.current) {
      const newScrollTop = textareaRef.current.scrollTop;
      lineNumbersRef.current.scrollTop = newScrollTop;
      syntaxHighlighterRef.current.scrollTop = newScrollTop;
      syntaxHighlighterRef.current.scrollLeft = textareaRef.current.scrollLeft;
      setScrollTop(newScrollTop);
    }
  }, []);

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.focus();
      // Move cursor to end
      const len = textarea.value.length;
      textarea.setSelectionRange(len, len);
      updateCursorFromTextarea(textarea);
    }
  }, [updateCursorFromTextarea]);

  const handleSave = useCallback(() => {
    // Update savedCode used for preview and eventual commit,
    // but don't close the editor or notify parent yet.
    setSavedCode(editedCode);
  }, [editedCode]);

  const handleCloseInternal = useCallback(() => {
    // Commit last saved version (not live unsaved edits)
    if (savedCode !== code) {
      onSave(savedCode);
    }
    onClose();
  }, [savedCode, code, onSave, onClose]);

  // Handle escape key to close, and Cmd/Ctrl+S to save preview state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCloseInternal();
      }
      // Cmd/Ctrl + S to save (update savedCode)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCloseInternal, handleSave]);

  const handleReset = () => {
    setEditedCode(savedCode);
  };

  const handleCopy = () => {
    const ok = copyToClipboard(editedCode);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  // Bracket pairs for auto-completion
  const BRACKET_PAIRS: Record<string, string> = {
    '(': ')',
    '[': ']',
    '{': '}',
    '"': '"',
    "'": "'",
    '`': '`',
  };

  const CLOSING_BRACKETS = new Set([')', ']', '}', '"', "'", '`']);

  // Handle keyboard shortcuts for indentation, auto-indent, and bracket completion
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const hasSelection = start !== end;

    // Bracket auto-completion
    if (BRACKET_PAIRS[e.key]) {
      const closingChar = BRACKET_PAIRS[e.key];
      
      if (hasSelection) {
        // Wrap selected text with brackets
        e.preventDefault();
        const selectedText = editedCode.slice(start, end);
        const newValue = editedCode.slice(0, start) + e.key + selectedText + closingChar + editedCode.slice(end);
        setEditedCode(newValue);
        
        requestAnimationFrame(() => {
          textarea.selectionStart = start + 1;
          textarea.selectionEnd = end + 1;
          updateCursorFromTextarea(textarea);
        });
        return;
      } else {
        // Auto-insert closing bracket/quote
        e.preventDefault();
        const newValue = editedCode.slice(0, start) + e.key + closingChar + editedCode.slice(end);
        setEditedCode(newValue);
        
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1;
          updateCursorFromTextarea(textarea);
        });
        return;
      }
    }

    // Skip over closing bracket if typing it when it's already there
    if (CLOSING_BRACKETS.has(e.key) && editedCode[start] === e.key) {
      e.preventDefault();
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
        updateCursorFromTextarea(textarea);
      });
      return;
    }

    // Backspace: delete matching bracket pair if cursor is between them
    if (e.key === 'Backspace' && !hasSelection && start > 0) {
      const charBefore = editedCode[start - 1];
      const charAfter = editedCode[start];
      if (BRACKET_PAIRS[charBefore] === charAfter) {
        e.preventDefault();
        const newValue = editedCode.slice(0, start - 1) + editedCode.slice(start + 1);
        setEditedCode(newValue);
        
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start - 1;
          updateCursorFromTextarea(textarea);
        });
        return;
      }
    }

    // Tab key handling
    if (e.key === 'Tab') {
      e.preventDefault();

      if (hasSelection) {
        // Multi-line indent/dedent
        const lineStartIndex = editedCode.lastIndexOf('\n', start - 1) + 1;
        const lineEndIndex = editedCode.indexOf('\n', end);
        const actualEnd = lineEndIndex === -1 ? editedCode.length : lineEndIndex;
        
        const selectedLines = editedCode.slice(lineStartIndex, actualEnd);
        const lines = selectedLines.split('\n');
        
        let newLines: string[];
        let deltaFirst = 0; // Change in first line length
        let deltaTotal = 0; // Total change in length
        
        if (e.shiftKey) {
          // Dedent: remove up to 2 leading spaces from each line
          newLines = lines.map((line, i) => {
            const match = line.match(/^( {1,2})/);
            const removed = match ? match[1].length : 0;
            if (i === 0) deltaFirst = -removed;
            deltaTotal -= removed;
            return line.slice(removed);
          });
        } else {
          // Indent: add 2 spaces to each line
          newLines = lines.map((line, i) => {
            if (i === 0) deltaFirst = 2;
            deltaTotal += 2;
            return '  ' + line;
          });
        }
        
        const newValue = editedCode.slice(0, lineStartIndex) + newLines.join('\n') + editedCode.slice(actualEnd);
        setEditedCode(newValue);
        
        requestAnimationFrame(() => {
          // Adjust selection to cover the modified lines
          textarea.selectionStart = Math.max(lineStartIndex, start + deltaFirst);
          textarea.selectionEnd = end + deltaTotal;
          updateCursorFromTextarea(textarea);
        });
      } else if (e.shiftKey) {
        // Single line dedent (Shift+Tab)
        const lineStart = editedCode.lastIndexOf('\n', start - 1) + 1;
        const lineContent = editedCode.slice(lineStart, start);
        const leadingSpaces = lineContent.match(/^( {1,2})/);
        
        if (leadingSpaces) {
          const spacesToRemove = leadingSpaces[1].length;
          const newValue = editedCode.slice(0, lineStart) + editedCode.slice(lineStart + spacesToRemove);
          setEditedCode(newValue);
          
          requestAnimationFrame(() => {
            textarea.selectionStart = textarea.selectionEnd = Math.max(lineStart, start - spacesToRemove);
            updateCursorFromTextarea(textarea);
          });
        }
      } else {
        // Single cursor indent (Tab)
        const newValue = editedCode.substring(0, start) + '  ' + editedCode.substring(end);
        setEditedCode(newValue);
        
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
          updateCursorFromTextarea(textarea);
        });
      }
      return;
    }

    // Enter key: auto-indent
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Get current line's indentation
      const lineStart = editedCode.lastIndexOf('\n', start - 1) + 1;
      const lineContent = editedCode.slice(lineStart, start);
      const indentMatch = lineContent.match(/^(\s*)/);
      const currentIndent = indentMatch ? indentMatch[1] : '';
      
      // Check if we should add extra indent (after opening brackets or colons)
      const charBefore = editedCode[start - 1];
      const charAfter = editedCode[start];
      const shouldExtraIndent = ['{', '(', '[', ':'].includes(charBefore);
      const extraIndent = shouldExtraIndent ? '  ' : '';
      
      // Check if cursor is between matching brackets like {}
      const isBetweenBrackets = 
        (charBefore === '{' && charAfter === '}') ||
        (charBefore === '(' && charAfter === ')') ||
        (charBefore === '[' && charAfter === ']');
      
      let insertText: string;
      let cursorOffset: number;
      
      if (isBetweenBrackets) {
        // Insert new line with extra indent, then another line with original indent
        insertText = '\n' + currentIndent + '  \n' + currentIndent;
        cursorOffset = 1 + currentIndent.length + 2; // Position cursor on the indented line
      } else {
        insertText = '\n' + currentIndent + extraIndent;
        cursorOffset = insertText.length;
      }
      
      const newValue = editedCode.slice(0, start) + insertText + editedCode.slice(end);
      setEditedCode(newValue);
      
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + cursorOffset;
        updateCursorFromTextarea(textarea);
        // Sync scroll after cursor moves
        handleScroll();
      });
      return;
    }
  };

  const lines = editedCode.split('\n');
  const lineCount = lines.length;
  const hasChanges = editedCode !== savedCode;

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
            type="button"
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
            type="button"
            onClick={handleReset}
            disabled={!hasChanges}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Reset changes"
          >
            <FaUndo className="text-xs" />
            <span>Reset</span>
          </button>

          {/* Preview toggle - only for React default export modules */}
          {canPreview && (
            <button
              onClick={() => setShowPreview((prev) => !prev)}
              onMouseEnter={() => {
                void loadCodePreview();
              }}
              onFocus={() => {
                void loadCodePreview();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors"
              title={showPreview ? "Hide preview" : "Show preview"}
            >
              <FaPlay className="text-xs" />
              <span>{showPreview ? 'Hide preview' : 'Preview'}</span>
            </button>
          )}
          
          {/* Save button */}
          <button
            type="button"
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
            type="button"
            onClick={handleCloseInternal}
            className="flex items-center justify-center w-8 h-8 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors ml-2"
            title="Close (Esc)"
          >
            <FaTimes />
          </button>
        </div>
      </div>
      
      {/* Editor area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor pane */}
        <div
          className="flex overflow-hidden"
          style={{ width: showPreview && canPreview ? '50%' : '100%' }}
        >
          {/* Line numbers */}
          <div
            ref={lineNumbersRef}
            className="flex-shrink-0 py-4 px-3 bg-bg-secondary border-r border-border-secondary overflow-hidden select-none"
            style={{ minWidth: '50px' }}
          >
            {lines.map((_, index) => (
              <div
                key={index}
                className={`text-right text-xs leading-[1.6] font-mono transition-colors ${
                  index + 1 === cursorLine 
                    ? 'text-text-primary font-medium' 
                    : 'text-text-tertiary'
                }`}
                style={{ height: '22.4px' }}
              >
                {index + 1}
              </div>
            ))}
          </div>
          
          {/* Code editor with overlay */}
          <div className="flex-1 relative overflow-hidden">
            {/* Current line highlight (bottom layer) */}
            <div 
              className="absolute left-0 right-0 bg-accent-primary/8 pointer-events-none transition-transform duration-75"
              style={{ 
                height: '22.4px',
                top: `${16 + (cursorLine - 1) * 22.4 - scrollTop}px`, // 16px padding + line offset - scroll
              }}
            />
            
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
              onChange={(e) => {
                setEditedCode(e.target.value);
                updateCursorFromTextarea(e.currentTarget);
              }}
              onScroll={handleScroll}
              onKeyDown={handleKeyDown}
              onClick={(e) => updateCursorFromTextarea(e.currentTarget)}
              onKeyUp={(e) => updateCursorFromTextarea(e.currentTarget)}
              onMouseUp={(e) => updateCursorFromTextarea(e.currentTarget)}
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

        {/* React preview pane */}
        {showPreview && canPreview && (
          <Suspense
            fallback={
              <div className="code-preview-root w-1/2 border-l border-border-secondary bg-bg-secondary flex flex-col">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border-secondary text-xs text-text-tertiary">
                  <span className="font-medium text-text-primary">Preview</span>
                </div>
                <div className="flex-1 flex items-center justify-center text-sm text-text-tertiary">
                  Loading preview…
                </div>
              </div>
            }
          >
            <CodePreview code={savedCode} isOpen={true} />
          </Suspense>
        )}
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
          <span>
            <kbd className="px-1.5 py-0.5 bg-bg-tertiary rounded text-text-secondary">⇧Tab</kbd> Dedent
          </span>
        </div>
        <div>
          Ln {cursorLine}, Col {cursorCol}
        </div>
      </div>
    </div>
  );
});

CodeEditor.displayName = 'CodeEditor';

export default CodeEditor;
