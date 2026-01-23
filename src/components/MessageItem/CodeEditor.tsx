import { memo, useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { FaTimes, FaSave, FaUndo, FaCopy, FaCheck, FaPlay, FaCode } from 'react-icons/fa';
import copyToClipboard from 'copy-to-clipboard';
import CodeMirror from '@uiw/react-codemirror';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  ViewUpdate,
} from '@codemirror/view';
import { EditorSelection, EditorState } from '@codemirror/state';
import {
  bracketMatching,
  HighlightStyle,
  indentOnInput,
  indentUnit,
  syntaxHighlighting,
} from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { history, historyKeymap, indentLess, indentWithTab } from '@codemirror/commands';
import { tags } from '@lezer/highlight';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { markdown } from '@codemirror/lang-markdown';
import { yaml } from '@codemirror/lang-yaml';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { isPythonPreviewSupported, renderPythonPreview } from '../../services/pythonPreviewService';

const REACT_IMPORT_REGEX = /from\s+['"]react['"]|require\(['"]react['"]\)/;
const EXPORT_DEFAULT_REGEX = /export\s+default\s+/;

const isReactModuleCode = (code: string): boolean => {
  if (!REACT_IMPORT_REGEX.test(code)) return false;
  if (!EXPORT_DEFAULT_REGEX.test(code)) return false;
  return true;
};

const loadCodePreview = () => import('./CodePreview');
const CodePreview = lazy(loadCodePreview);

const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: 'var(--color-bg-primary)',
    color: 'var(--code-fg)',
  },
  '.cm-scroller': {
    fontFamily: 'var(--font-mono)',
    fontSize: '14px',
    lineHeight: '1.6',
    overflow: 'auto',
    backgroundColor: 'var(--color-bg-primary)',
  },
  '.cm-content': {
    padding: '16px',
    backgroundColor: 'var(--color-bg-primary)',
  },
  '.cm-line': {
    lineHeight: '1.6',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--color-bg-secondary)',
    borderRight: '1px solid var(--color-border-secondary)',
  },
  '.cm-lineNumbers': {
    minWidth: '50px',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    color: 'var(--color-text-tertiary)',
    fontSize: '14px',
    lineHeight: '1.6',
    padding: '0 12px',
    textAlign: 'right',
    boxSizing: 'border-box',
  },
  '.cm-activeLine': {
    backgroundColor: 'var(--color-accent-light)',
  },
  '.cm-activeLineGutter': {
    color: 'var(--color-text-primary)',
    backgroundColor: 'var(--color-bg-tertiary)',
    fontWeight: '500',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'var(--color-accent-light)',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'var(--color-accent-light)',
  },
  '.cm-cursor': {
    borderLeftColor: 'var(--color-text-primary)',
  },
  '.cm-selectionMatch': {
    backgroundColor: 'var(--color-accent-light)',
  },
});

const editorHighlightStyle = HighlightStyle.define([
  { tag: tags.comment, color: 'var(--code-token-comment)' },
  { tag: tags.lineComment, color: 'var(--code-token-comment)' },
  { tag: tags.blockComment, color: 'var(--code-token-comment)' },
  { tag: tags.docComment, color: 'var(--code-token-comment)' },
  { tag: tags.punctuation, color: 'var(--code-token-punctuation)' },
  { tag: tags.propertyName, color: 'var(--code-token-property)' },
  { tag: tags.tagName, color: 'var(--code-token-tag)' },
  { tag: tags.attributeName, color: 'var(--code-token-attr-name)' },
  { tag: tags.bool, color: 'var(--code-token-boolean)' },
  { tag: tags.number, color: 'var(--code-token-number)' },
  { tag: tags.string, color: 'var(--code-token-string)' },
  { tag: tags.operator, color: 'var(--code-token-operator)' },
  { tag: tags.keyword, color: 'var(--code-token-keyword)' },
  { tag: tags.function(tags.variableName), color: 'var(--code-token-function)' },
  { tag: tags.className, color: 'var(--code-token-class-name)' },
  { tag: tags.variableName, color: 'var(--code-token-variable)' },
  { tag: tags.regexp, color: 'var(--code-token-regex)' },
  { tag: tags.constant(tags.name), color: 'var(--code-token-constant)' },
  { tag: tags.invalid, color: 'var(--color-error)' },
]);

interface CodeEditorProps {
  code: string;
  language: string;
  onSave: (newCode: string) => void;
  onClose: () => void;
  variant?: 'modal' | 'panel';
  commitOnSave?: boolean;
  showCloseButton?: boolean;
}

const CodeEditor = memo<CodeEditorProps>(({
  code,
  language,
  onSave,
  onClose,
  variant = 'modal',
  commitOnSave = false,
  showCloseButton = true,
}) => {
  const [savedCode, setSavedCode] = useState(code);
  const [editedCode, setEditedCode] = useState(code);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);
  const editedCodeRef = useRef(editedCode);
  const saveHandlerRef = useRef<() => void>(() => undefined);
  const didFocusRef = useRef(false);
  const pythonPreviewAbortRef = useRef<AbortController | null>(null);
  const lastPreviewedCodeRef = useRef<string | null>(null);
  const normalizedLanguage = language.toLowerCase();
  const isPython = normalizedLanguage === 'python' || normalizedLanguage === 'py';
  const pythonPreviewSupported = isPython && isPythonPreviewSupported();
  const [pythonPreviewCode, setPythonPreviewCode] = useState('');
  const [pythonPreviewError, setPythonPreviewError] = useState<string | null>(null);
  const [pythonPreviewLoading, setPythonPreviewLoading] = useState(false);

  // Keep local savedCode in sync with parent prop
  useEffect(() => {
    setSavedCode(code);
    setEditedCode(code);
    editedCodeRef.current = code;
  }, [code]);

  useEffect(() => {
    editedCodeRef.current = editedCode;
  }, [editedCode]);

  useEffect(() => {
    return () => {
      pythonPreviewAbortRef.current?.abort();
    };
  }, []);

  const requestPythonPreview = useCallback(async (overrideCode?: string) => {
    if (!pythonPreviewSupported) return;
    const codeToSend = overrideCode ?? editedCodeRef.current;
    if (!codeToSend.trim()) {
      setPythonPreviewError('No code to preview.');
      setPythonPreviewCode('');
      return;
    }
    if (lastPreviewedCodeRef.current === codeToSend) {
      return;
    }

    pythonPreviewAbortRef.current?.abort();
    const controller = new AbortController();
    pythonPreviewAbortRef.current = controller;

    setPythonPreviewLoading(true);
    setPythonPreviewError(null);

    try {
      const response = await renderPythonPreview(codeToSend, controller.signal);
      if (controller.signal.aborted) return;
      if (!response.ok) {
        setPythonPreviewCode('');
        setPythonPreviewError(response.error || 'Preview failed.');
        return;
      }
      lastPreviewedCodeRef.current = codeToSend;
      setPythonPreviewCode(response.reactCode);
      if (response.warnings?.length) {
        setPythonPreviewError(response.warnings.join(' • '));
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      setPythonPreviewCode('');
      setPythonPreviewError(error instanceof Error ? error.message : 'Preview failed.');
    } finally {
      if (!controller.signal.aborted) {
        setPythonPreviewLoading(false);
      }
    }
  }, [pythonPreviewSupported]);

  const handleSave = useCallback(() => {
    const nextCode = editedCodeRef.current;
    if (commitOnSave) {
      onSave(nextCode);
    }
    setSavedCode(nextCode);
    if (pythonPreviewSupported) {
      void requestPythonPreview(nextCode);
    }
  }, [commitOnSave, onSave, pythonPreviewSupported, requestPythonPreview]);

  useEffect(() => {
    saveHandlerRef.current = handleSave;
  }, [handleSave]);

  const handleCloseInternal = useCallback(() => {
    // Commit last saved version (not live unsaved edits) when not committing on save.
    if (!commitOnSave && savedCode !== code) {
      onSave(savedCode);
    }
    onClose();
  }, [commitOnSave, savedCode, code, onSave, onClose]);

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
    const ok = copyToClipboard(editedCodeRef.current);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleTogglePreview = useCallback(() => {
    setShowPreview((prev) => {
      const next = !prev;
      if (next && pythonPreviewSupported) {
        void requestPythonPreview();
      }
      return next;
    });
  }, [pythonPreviewSupported, requestPythonPreview]);

  const canPreview = useMemo(
    () => pythonPreviewSupported || isReactModuleCode(savedCode),
    [pythonPreviewSupported, savedCode]
  );

  useEffect(() => {
    if (!canPreview && showPreview) {
      setShowPreview(false);
    }
  }, [canPreview, showPreview]);

  useEffect(() => {
    if (!pythonPreviewSupported) {
      pythonPreviewAbortRef.current?.abort();
      setPythonPreviewCode('');
      setPythonPreviewError(null);
      setPythonPreviewLoading(false);
      lastPreviewedCodeRef.current = null;
      return;
    }
    if (showPreview) {
      void requestPythonPreview(code);
    }
  }, [pythonPreviewSupported, showPreview, code, requestPythonPreview]);

  const editorKeymaps = useMemo(
    () => keymap.of([
      ...closeBracketsKeymap,
      ...historyKeymap,
      indentWithTab,
      { key: 'Shift-Tab', run: indentLess },
      { key: 'Mod-s', run: () => {
        saveHandlerRef.current();
        return true;
      } },
    ]),
    []
  );

  const languageExtension = useMemo(() => {
    const normalized = language.toLowerCase();
    switch (normalized) {
      case 'js':
      case 'javascript':
        return javascript();
      case 'jsx':
        return javascript({ jsx: true });
      case 'ts':
      case 'typescript':
        return javascript({ typescript: true });
      case 'tsx':
        return javascript({ typescript: true, jsx: true });
      case 'json':
        return json();
      case 'htm':
      case 'html':
        return html();
      case 'css':
      case 'scss':
        return css();
      case 'md':
      case 'markdown':
        return markdown();
      case 'yml':
      case 'yaml':
        return yaml();
      case 'py':
      case 'python':
        return python();
      case 'java':
        return java();
      default:
        return [];
    }
  }, [language]);

  const editorExtensions = useMemo(
    () => [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      history(),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      EditorState.tabSize.of(2),
      indentUnit.of('  '),
      editorKeymaps,
      editorTheme,
      syntaxHighlighting(editorHighlightStyle),
      languageExtension,
    ],
    [editorKeymaps, languageExtension]
  );

  const handleEditorChange = useCallback((value: string) => {
    editedCodeRef.current = value;
    setEditedCode(value);
  }, []);

  const handleEditorUpdate = useCallback((viewUpdate: ViewUpdate) => {
    if (!didFocusRef.current) {
      const view = viewUpdate.view;
      view.focus();
      view.dispatch({ selection: EditorSelection.cursor(view.state.doc.length) });
      didFocusRef.current = true;
    }

    const pos = viewUpdate.state.selection.main.head;
    const line = viewUpdate.state.doc.lineAt(pos);
    setCursorLine(line.number);
    setCursorCol(pos - line.from + 1);
  }, []);

  const lineCount = editedCode.split('\n').length;
  const hasChanges = editedCode !== savedCode;
  const previewCode = pythonPreviewSupported ? pythonPreviewCode : savedCode;
  const previewLoading = pythonPreviewSupported && pythonPreviewLoading;
  const previewError = pythonPreviewSupported ? pythonPreviewError : null;

  const containerClasses = variant === 'modal'
    ? 'fixed inset-0 z-modal bg-bg-primary flex flex-col animate-fade-in'
    : 'h-full w-full bg-bg-primary flex flex-col';

  return (
    <div className={containerClasses}>
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

          {/* Preview toggle - React modules or Python preview */}
          {canPreview && (
            <button
              onClick={handleTogglePreview}
              onMouseEnter={() => {
                void loadCodePreview();
              }}
              onFocus={() => {
                void loadCodePreview();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors"
              title={showPreview ? (variant === 'panel' ? 'Show editor' : 'Hide preview') : 'Show preview'}
            >
              {variant === 'panel' ? (
                // Panel: toggle between editor/preview
                showPreview ? <FaCode className="text-xs" /> : <FaPlay className="text-xs" />
              ) : (
                // Modal: show/hide preview alongside editor
                <FaPlay className="text-xs" />
              )}
              <span>
                {variant === 'panel'
                  ? (showPreview ? 'Editor' : 'Preview')
                  : (showPreview ? 'Hide Preview' : 'Preview')
                }
              </span>
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
          {showCloseButton && (
            <button
              type="button"
              onClick={handleCloseInternal}
              className="flex items-center justify-center w-8 h-8 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors ml-2"
              title="Close (Esc)"
            >
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Editor pane */}
        {/* In modal: always show (split view); In panel: hide when preview active (toggle view) */}
        {(variant === 'modal' || !(showPreview && canPreview)) && (
          <div
            className="flex flex-col min-h-0"
            style={{ width: variant === 'modal' && showPreview && canPreview ? '50%' : '100%' }}
          >
            <div className="flex-1 min-h-0 overflow-auto">
              <CodeMirror
                value={editedCode}
                height="100%"
                basicSetup={false}
                extensions={editorExtensions}
                onChange={handleEditorChange}
                onUpdate={handleEditorUpdate}
              />
            </div>
          </div>
        )}

        {/* Preview pane */}
        {/* In modal: split view (50%); In panel: full width toggle */}
        {showPreview && canPreview && (
          <Suspense
            fallback={
              <div className={`code-preview-root bg-bg-secondary flex flex-col ${variant === 'modal' ? 'w-1/2 border-l border-border-secondary' : 'w-full'}`}>
                <div className="flex items-center justify-between px-3 py-2 border-b border-border-secondary text-xs text-text-tertiary">
                  <span className="font-medium text-text-primary">Preview</span>
                </div>
                <div className="flex-1 flex items-center justify-center text-sm text-text-tertiary">
                  Loading preview…
                </div>
              </div>
            }
          >
            <CodePreview
              code={previewCode}
              isOpen={true}
              variant={variant}
              loading={previewLoading}
              externalError={previewError}
            />
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
