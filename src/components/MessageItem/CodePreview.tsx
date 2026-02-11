import { memo, useEffect, useMemo } from 'react';
import * as ReactModule from 'react';
import * as ReactDomModule from 'react-dom';
import { LiveError, LivePreview, LiveProvider } from 'react-live';
import { transform } from 'sucrase';
import * as Recharts from 'recharts';
import Plotly from 'plotly.js-dist-min';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import * as am5percent from '@amcharts/amcharts5/percent';
import * as am5radar from '@amcharts/amcharts5/radar';
import * as am5hierarchy from '@amcharts/amcharts5/hierarchy';
import * as am5map from '@amcharts/amcharts5/map';
import * as am5flow from '@amcharts/amcharts5/flow';
import am5themesAnimated from '@amcharts/amcharts5/themes/Animated';
import am5themesDark from '@amcharts/amcharts5/themes/Dark';

const REACT_IMPORT_REGEX = /from\s+['"]react['"]|require\(['"]react['"]\)/;
const EXPORT_DEFAULT_REGEX = /export\s+default\s+/;

const buildReactLiveCode = (code: string): string => {
  const compiled = transform(code, {
    transforms: ['typescript', 'jsx', 'imports'],
  }).code;

  return `
const module = { exports: {} };
const exports = module.exports;
const require = (id) => {
  const imported = __imports[id];
  if (!imported) {
    throw new Error('Unsupported import: ' + id);
  }
  return imported;
};

${compiled}

const PreviewComponent = module.exports.default || exports.default || module.exports;
if (!PreviewComponent) {
  throw new Error('Missing default export. Use export default Component.');
}
render(React.createElement(PreviewComponent));
`;
};

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
  const imports = useMemo(
    () => ({
      react: ReactModule,
      'react-dom': ReactDomModule,
      recharts: Recharts,
      mchart: Recharts,
      'plotly.js-dist-min': Plotly,
      '@amcharts/amcharts5': am5,
      '@amcharts/amcharts5/xy': am5xy,
      '@amcharts/amcharts5/percent': am5percent,
      '@amcharts/amcharts5/radar': am5radar,
      '@amcharts/amcharts5/hierarchy': am5hierarchy,
      '@amcharts/amcharts5/map': am5map,
      '@amcharts/amcharts5/flow': am5flow,
      '@amcharts/amcharts5/themes/Animated': am5themesAnimated,
      '@amcharts/amcharts5/themes/Dark': am5themesDark,
    }),
    []
  );

  const scope = useMemo(
    () => ({
      React: ReactModule,
      __imports: imports,
    }),
    [imports]
  );

  const preparedCode = useMemo(() => {
    if (!isReactModuleCode(code)) {
      return { liveCode: null, prepareError: null };
    }
    try {
      return { liveCode: buildReactLiveCode(code), prepareError: null };
    } catch (runnerError) {
      return {
        liveCode: null,
        prepareError:
          runnerError instanceof Error
            ? runnerError.message
            : String(runnerError),
      };
    }
  }, [code]);

  const displayError = externalError || preparedCode.prepareError;

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
        {isReactModuleCode(code) && preparedCode.liveCode ? (
          <LiveProvider
            key={rerenderToken}
            code={preparedCode.liveCode}
            scope={scope}
            noInline
          >
            <LivePreview />
            <LiveError className="text-warning text-xs px-3 py-2 border-t border-border-secondary whitespace-pre-wrap" />
          </LiveProvider>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-text-tertiary">
            {displayError ? 'Preview failed.' : 'Generating preview…'}
          </div>
        )}
      </div>
    </div>
  );
});

CodePreview.displayName = 'CodePreview';

export default CodePreview;
