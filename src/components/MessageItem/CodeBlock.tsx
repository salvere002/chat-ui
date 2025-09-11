import { memo, useState } from 'react';
import { FaCheck, FaCopy, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useThemeStore } from '../../stores';
import copyToClipboard from 'copy-to-clipboard';

interface CodeBlockProps {
  children: string; 
  language: string; 
  className?: string;
}

const CodeBlock = memo<CodeBlockProps>(({ 
  children, 
  language, 
  className,
  ...props 
}) => {
  const [copied, setCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { theme } = useThemeStore();

  const handleCopy = () => {
    const ok = copyToClipboard(children);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 500);
    }
  };

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Use theme-appropriate syntax highlighting
  const syntaxTheme = theme === 'dark' ? vscDarkPlus : oneLight;

  // Get preview content (first few lines for collapsed state)
  const lines = children.split('\n');
  const lineCount = lines.length;
  const previewLines = lines.slice(0, 3).join('\n');
  const shouldShowCollapse = lineCount > 1; // Only show collapse for code blocks with more than 5 lines

  // Determine content to show
  const displayContent = isCollapsed ? previewLines : children;

  return (
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
            backgroundColor: theme === 'dark' ? 'var(--color-bg-secondary)' : '#f8f9fa',
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
              background: `linear-gradient(transparent, ${theme === 'dark' ? 'var(--color-bg-secondary)' : '#f8f9fa'})`
            }}
          />
        )}
      </div>

      {/* Copy button for code blocks without collapse functionality */}
      {!shouldShowCollapse && (
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 bg-bg-tertiary hover:bg-bg-secondary text-text-tertiary hover:text-text-primary border border-border-secondary rounded opacity-0 group-hover/codeblock:opacity-100 transition-all duration-200"
          title={copied ? "Copied!" : "Copy code"}
        >
          {copied ? (
            <FaCheck className="text-accent-primary text-xs" />
          ) : (
            <FaCopy className="text-xs" />
          )}
        </button>
      )}
    </div>
  );
});

CodeBlock.displayName = 'CodeBlock';

export default CodeBlock;
