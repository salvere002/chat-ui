import { memo, useEffect, useMemo, useState } from 'react';
import * as ReactModule from 'react';
import { Runner } from 'react-runner';
import * as Recharts from 'recharts';
import Plotly from 'plotly.js-dist-min';

const REACT_IMPORT_REGEX = /from\s+['"]react['"]|require\(['"]react['"]\)/;
const EXPORT_DEFAULT_REGEX = /export\s+default\s+/;

export const isReactModuleCode = (code: string): boolean => {
  if (!REACT_IMPORT_REGEX.test(code)) return false;
  if (!EXPORT_DEFAULT_REGEX.test(code)) return false;
  return true;
};

interface CodePreviewProps {
  code: string;
  isOpen: boolean;
  variant?: 'modal' | 'panel';
  loading?: boolean;
  externalError?: string | null;
  rerenderToken?: number;
}

const CodePreview = memo<CodePreviewProps>(({
  code,
  isOpen,
  variant = 'modal',
  loading = false,
  externalError = null,
  rerenderToken = 0,
}) => {
  const [error, setError] = useState<string | null>(null);
  const displayError = externalError || error;

  const scope = useMemo(
    () => ({
      import: {
        react: ReactModule,
        recharts: Recharts,
        'plotly.js-dist-min': Plotly,
      },
    }),
    []
  );

  useEffect(() => {
    setError(null);
  }, [code]);

  useEffect(() => {
    if (!isOpen) return;
    const frameId = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [rerenderToken, isOpen]);

  if (!isOpen || (!isReactModuleCode(code) && !loading && !externalError)) {
    return null;
  }

  return (
    <div className={`code-preview-root bg-bg-secondary flex flex-col ${variant === 'modal' ? 'w-1/2 border-l border-border-secondary' : 'w-full'}`}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-secondary text-xs text-text-tertiary">
        <span className="font-medium text-text-primary">Preview</span>
        {loading && !displayError && (
          <span className="text-text-tertiary">Generating…</span>
        )}
        {displayError && (
          <span className="text-warning truncate max-w-[80%]">
            {displayError}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-auto bg-bg-primary">
        {isReactModuleCode(code) ? (
          <Runner
            key={rerenderToken}
            code={code}
            scope={scope}
            onRendered={(runnerError) => {
              setError(
                runnerError ? runnerError.message || String(runnerError) : null
              );
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-text-tertiary">
            {externalError ? 'Preview failed.' : 'Generating preview…'}
          </div>
        )}
      </div>
    </div>
  );
});

CodePreview.displayName = 'CodePreview';

export default CodePreview;
