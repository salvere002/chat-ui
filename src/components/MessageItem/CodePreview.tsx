import { memo, useMemo, useState } from 'react';
import * as ReactModule from 'react';
import { Runner } from 'react-runner';
import * as Recharts from 'recharts';

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
}

const CodePreview = memo<CodePreviewProps>(({ code, isOpen }) => {
  const [error, setError] = useState<string | null>(null);

  const scope = useMemo(
    () => ({
      import: {
        react: ReactModule,
        recharts: Recharts,
      },
    }),
    []
  );

  if (!isOpen || !isReactModuleCode(code)) {
    return null;
  }

  return (
    <div className="code-preview-root w-1/2 border-l border-border-secondary bg-bg-secondary flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-secondary text-xs text-text-tertiary">
        <span className="font-medium text-text-primary">Preview</span>
        {error && (
          <span className="text-warning truncate max-w-[60%]">
            {error}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-auto bg-bg-primary">
        <Runner
          code={code}
          scope={scope}
          onRendered={(runnerError) => {
            setError(
              runnerError ? runnerError.message || String(runnerError) : null
            );
          }}
        />
      </div>
    </div>
  );
});

CodePreview.displayName = 'CodePreview';

export default CodePreview;
