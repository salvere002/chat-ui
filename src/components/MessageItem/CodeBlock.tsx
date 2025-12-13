import { memo, useMemo, useState, useEffect, lazy, Suspense } from 'react';
import { FaCheck, FaCopy, FaChevronDown, FaChevronUp, FaEdit } from 'react-icons/fa';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import copyToClipboard from 'copy-to-clipboard';
import { createPortal } from 'react-dom';

const loadCodeEditor = () => import('./CodeEditor');
const CodeEditor = lazy(loadCodeEditor);

interface CodeBlockProps {
  children: string; 
  language: string; 
  className?: string;
  onCodeUpdate?: (oldCode: string, newCode: string) => void;
}

const CodeBlock = memo<CodeBlockProps>(({ 
  children, 
  language, 
  className,
  onCodeUpdate,
  ...props 
}) => {
  const [copied, setCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [currentCode, setCurrentCode] = useState(children);

  // Sync currentCode with children prop when it changes externally
  useEffect(() => {
    setCurrentCode(children);
  }, [children]);

  // Detect desktop vs mobile (desktop = width >= 768px)
  useEffect(() => {
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    
    checkIsDesktop();
    window.addEventListener('resize', checkIsDesktop);
    return () => window.removeEventListener('resize', checkIsDesktop);
  }, []);

  const handleCopy = () => {
    const ok = copyToClipboard(currentCode);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 500);
    }
  };

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleOpenEditor = () => {
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
  };

  const handleSaveCode = (newCode: string) => {
    if (newCode !== currentCode) {
      const oldCode = currentCode;
      setCurrentCode(newCode);
      onCodeUpdate?.(oldCode, newCode);
    }
  };

  // Theme-agnostic Prism style using CSS variables so theme flips don't re-render
  const syntaxTheme = useMemo(() => ({
    'pre[class*="language-"]': {
      color: 'var(--code-fg)',
      fontSize: '13px',
      textShadow: 'none',
      fontFamily: 'var(--font-mono)',
      direction: 'ltr',
      textAlign: 'left',
      whiteSpace: 'pre',
      wordSpacing: 'normal',
      wordBreak: 'normal',
      lineHeight: '1.5',
      MozTabSize: '4',
      OTabSize: '4',
      tabSize: '4',
      WebkitHyphens: 'none',
      MozHyphens: 'none',
      msHyphens: 'none',
      hyphens: 'none',
      padding: '1em',
      margin: '.5em 0',
      overflow: 'auto',
      background: 'var(--code-bg)'
    },
    'code[class*="language-"]': {
      color: 'var(--code-fg)',
      fontSize: '13px',
      textShadow: 'none',
      fontFamily: 'var(--font-mono)'
    },
    comment: { color: 'var(--code-token-comment)' },
    prolog: { color: 'var(--code-token-comment)' },
    doctype: { color: 'var(--code-token-keyword)' },
    punctuation: { color: 'var(--code-token-punctuation)' },
    property: { color: 'var(--code-token-property)' },
    tag: { color: 'var(--code-token-tag)' },
    boolean: { color: 'var(--code-token-boolean)' },
    number: { color: 'var(--code-token-number)' },
    constant: { color: 'var(--code-token-constant)' },
    selector: { color: 'var(--code-token-selector)' },
    'attr-name': { color: 'var(--code-token-attr-name)' },
    string: { color: 'var(--code-token-string)' },
    char: { color: 'var(--code-token-string)' },
    builtin: { color: 'var(--code-token-builtin)' },
    deleted: { color: 'var(--code-token-deleted)' },
    operator: { color: 'var(--code-token-operator)' },
    entity: { color: 'var(--code-token-entity)' },
    atrule: { color: 'var(--code-token-atrule)' },
    keyword: { color: 'var(--code-token-keyword)' },
    function: { color: 'var(--code-token-function)' },
    'class-name': { color: 'var(--code-token-class-name)' },
    variable: { color: 'var(--code-token-variable)' },
    regex: { color: 'var(--code-token-regex)' },
    important: { color: 'var(--code-token-important)' }
  }) as any, []);

  // Get preview content (first few lines for collapsed state)
  const lines = currentCode.split('\n');
  const lineCount = lines.length;
  const previewLines = lines.slice(0, 3).join('\n');
  const shouldShowCollapse = lineCount > 1; // Only show collapse for code blocks with more than 1 line

  // Determine content to show
  const displayContent = isCollapsed ? previewLines : currentCode;

  // Check if editing is available (desktop only and has callback)
  const canEdit = isDesktop && !!onCodeUpdate;

  return (
    <>
      <div className="relative group/codeblock">
        {/* Header with language and collapse button */}
        {shouldShowCollapse && (
          <div className="flex items-center justify-between px-3 py-2 bg-bg-secondary border border-border-secondary border-b-0 rounded-t-lg">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
                {language}
              </span>
              <span className="text-xs text-text-tertiary">
                {lineCount} lines
              </span>
            </div>
            <div className="flex items-center gap-1">
              {/* Edit button - desktop only */}
              {canEdit && (
                <button
                  onClick={handleOpenEditor}
                  onMouseEnter={() => {
                    void loadCodeEditor();
                  }}
                  className="flex items-center justify-center w-6 h-6 bg-transparent hover:bg-bg-tertiary text-text-tertiary hover:text-accent-primary border-none rounded transition-all duration-200"
                  title="Edit in code editor"
                >
                  <FaEdit className="text-xs" />
                </button>
              )}
              {/* Copy button */}
              <button
                onClick={handleCopy}
                className="flex items-center justify-center w-6 h-6 bg-transparent hover:bg-bg-tertiary text-text-tertiary hover:text-text-primary border-none rounded transition-all duration-200"
                title={copied ? "Copied!" : "Copy code"}
              >
                {copied ? (
                  <FaCheck className="text-accent-primary text-xs" />
                ) : (
                  <FaCopy className="text-xs" />
                )}
              </button>
              {/* Collapse button */}
              <button
                onClick={handleToggleCollapse}
                className="flex items-center justify-center w-6 h-6 bg-transparent hover:bg-bg-tertiary text-text-tertiary hover:text-text-primary border-none rounded transition-all duration-200"
                title={isCollapsed ? "Expand code" : "Collapse code"}
              >
                {isCollapsed ? (
                  <FaChevronDown className="text-xs" />
                ) : (
                  <FaChevronUp className="text-xs" />
                )}
              </button>
            </div>
          </div>
        )}
      
      {/* Code content with syntax highlighting */}
      <div className={`relative ${isCollapsed ? 'overflow-hidden' : ''}`}>
        <SyntaxHighlighter
          style={syntaxTheme}
          language={language}
          PreTag="div"
          className={className}
          customStyle={{
            margin: 0,
            borderRadius: shouldShowCollapse ? (isCollapsed ? '0 0 0.5rem 0.5rem' : '0 0 0.5rem 0.5rem') : '0.5rem',
            backgroundColor: 'var(--color-bg-secondary)',
            border: `1px solid var(--color-border-secondary)`,
            borderTop: shouldShowCollapse ? 'none' : `1px solid var(--color-border-secondary)`,
            fontSize: '0.875rem', // 14px - smaller font size
            lineHeight: '1.5',
            padding: '1rem',
            maxHeight: isCollapsed ? '120px' : 'none',
            transition: 'max-height 300ms ease-in-out',
          }}
          {...props}
        >
          {displayContent}
        </SyntaxHighlighter>
        
        {/* Fade overlay for collapsed state */}
        {isCollapsed && shouldShowCollapse && (
          <div 
            className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none"
            style={{
              background: `linear-gradient(transparent, var(--color-bg-secondary))`
            }}
          />
        )}
      </div>

        {/* Buttons for code blocks without collapse functionality */}
        {!shouldShowCollapse && (
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/codeblock:opacity-100 transition-all duration-200">
            {/* Edit button - desktop only */}
            {canEdit && (
              <button
                onClick={handleOpenEditor}
                onMouseEnter={() => {
                  void loadCodeEditor();
                }}
                className="flex items-center justify-center w-7 h-7 bg-bg-tertiary hover:bg-bg-secondary text-text-tertiary hover:text-accent-primary border border-border-secondary rounded"
                title="Edit in code editor"
              >
                <FaEdit className="text-xs" />
              </button>
            )}
            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="flex items-center justify-center w-7 h-7 bg-bg-tertiary hover:bg-bg-secondary text-text-tertiary hover:text-text-primary border border-border-secondary rounded"
              title={copied ? "Copied!" : "Copy code"}
            >
              {copied ? (
                <FaCheck className="text-accent-primary text-xs" />
              ) : (
                <FaCopy className="text-xs" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Code Editor Portal - renders at document root */}
      {isEditorOpen && createPortal(
        <Suspense
          fallback={
            <div className="fixed inset-0 z-modal bg-bg-primary flex items-center justify-center animate-fade-in">
              <div className="px-5 py-4 rounded-lg bg-bg-elevated border border-border-primary shadow-lg text-text-secondary">
                Loading editor…
              </div>
            </div>
          }
        >
          <CodeEditor
            code={currentCode}
            language={language}
            onSave={handleSaveCode}
            onClose={handleCloseEditor}
          />
        </Suspense>,
        document.body
      )}
    </>
  );
});

CodeBlock.displayName = 'CodeBlock';

export default CodeBlock;
