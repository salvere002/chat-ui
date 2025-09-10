import React, { useEffect, useMemo, useState, useRef } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import useMcpStore from '../stores/mcpStore';

import { MCPToolInfo } from '../services/mcpService';

const ToolBadge: React.FC<{ tool: MCPToolInfo }> = ({ tool }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ 
    top: 0, 
    left: 0, 
    transform: 'translateX(-50%) translateY(-100%)',
    arrowLeft: '50%'
  });
  const badgeRef = useRef<HTMLSpanElement>(null);

  const handleMouseEnter = () => {
    if (badgeRef.current && (tool.description || tool.title || tool.inputSchema)) {
      const rect = badgeRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const tooltipWidth = 512; // Increased from 448px to accommodate more content
      const badgeCenter = rect.left + rect.width / 2;
      
      // Calculate initial centered position
      let left = badgeCenter;
      let transform = 'translateX(-50%) translateY(-100%)';
      let arrowLeft = '50%';
      
      // Check if tooltip would overflow on the right
      if (left + tooltipWidth / 2 > viewportWidth - 16) {
        // Align to right edge with padding
        left = viewportWidth - 16;
        transform = 'translateX(-100%) translateY(-100%)';
        // Position arrow relative to badge center
        arrowLeft = `${((badgeCenter - left) / tooltipWidth) * 100 + 100}%`;
      }
      // Check if tooltip would overflow on the left
      else if (left - tooltipWidth / 2 < 16) {
        // Align to left edge with padding
        left = 16;
        transform = 'translateX(0%) translateY(-100%)';
        // Position arrow relative to badge center
        arrowLeft = `${((badgeCenter - left) / tooltipWidth) * 100}%`;
      }
      
      setTooltipPosition({
        top: rect.top - 8,
        left,
        transform,
        arrowLeft
      });
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <>
      <span
        ref={badgeRef}
        className="inline-flex items-center px-2 py-1 rounded-md text-[11px] bg-bg-primary border border-border-primary text-text-secondary cursor-help transition-colors duration-150 hover:bg-bg-secondary hover:text-text-primary hover:border-text-tertiary"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {tool.name}
      </span>
      {showTooltip && (tool.description || tool.title || tool.inputSchema) && (
        <div
          className="fixed pointer-events-none z-tooltip transition-opacity duration-200"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            transform: tooltipPosition.transform
          }}
        >
          <div className="px-3 py-3 bg-bg-elevated text-text-primary text-xs rounded-md shadow-lg border border-border-primary max-w-lg w-max">
            <div className="font-medium mb-2">{tool.title || tool.name}</div>
            {tool.description && (
              <div className="text-text-secondary leading-relaxed mb-3 whitespace-pre-wrap">
                {tool.description}
              </div>
            )}
            {tool.inputSchema?.properties && (
              <div className="border-t border-border-secondary pt-2">
                <div className="font-medium text-text-primary mb-2">Parameters:</div>
                <div className="space-y-1">
                  {Object.entries(tool.inputSchema.properties).map(([paramName, param]) => (
                    <div key={paramName} className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-text-primary">{paramName}</span>
                        <span className="text-text-tertiary">({param.type})</span>
                        {tool.inputSchema?.required?.includes(paramName) && (
                          <span className="text-red-400 text-[10px]">required</span>
                        )}
                      </div>
                      {param.description && (
                        <div className="text-text-secondary text-[11px] ml-0.5 leading-tight">
                          {param.description.length > 100 ? `${param.description.substring(0, 100)}...` : param.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div 
              className="absolute border-4 border-transparent"
              style={{
                top: '100%',
                left: tooltipPosition.arrowLeft,
                transform: 'translateX(-50%)',
                borderTopColor: 'var(--color-bg-elevated)'
              }}
            ></div>
          </div>
        </div>
      )}
    </>
  );
};

const JsonEditor: React.FC<{
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
}> = ({ value, onChange, error }) => {
  return (
    <div className="mb-4 last:mb-0 flex flex-col h-full">
      <label className="block mb-2 text-sm font-medium text-text-secondary">MCP JSON Configuration</label>
      <div className="flex-1 min-h-0 flex flex-col">
        <TextareaAutosize
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          minRows={6}
          maxRows={16}
          style={{ 
            transition: 'height 150ms ease'
          }}
          className="w-full p-3 bg-bg-secondary text-text-primary border border-border-primary rounded-md font-mono text-xs leading-5 resize-none transition-all duration-150 hover:border-text-tertiary focus:outline-none focus:border-border-focus focus:shadow-[0_0_0_3px_var(--color-accent-light)] focus:bg-bg-primary"
        />
      </div>
      {error && <p className="mt-2 text-xs text-error">{error}</p>}
    </div>
  );
};

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label?: string }> = ({ checked, onChange, label }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-primary"
      style={{
        backgroundColor: checked ? 'var(--color-accent-primary)' : 'var(--color-bg-tertiary)',
        border: checked ? 'none' : '1px solid var(--color-border-primary)'
      }}
    >
      <span
        className="inline-block h-4 w-4 rounded-full shadow-sm transition-all duration-200 ease-in-out"
        style={{
          backgroundColor: '#ffffff',
          transform: checked ? 'translateX(24px)' : 'translateX(2px)'
        }}
      />
      {label && <span className="sr-only">{label}</span>}
    </button>
  );
};

const ServerCard: React.FC<{ serverKey: string }> = ({ serverKey }) => {
  const { servers, setEnabled, refreshServer } = useMcpStore();
  const item = servers[serverKey];
  if (!item) return null;
  const isLoading = item.status === 'connecting';
  const hasError = item.status === 'error';
  return (
    <div className="p-4 border border-border-secondary rounded-md bg-bg-secondary flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="m-0 text-sm font-semibold text-text-primary truncate">{item.key}</h4>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
              hasError
                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                : isLoading
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              {hasError ? 'error' : isLoading ? 'connecting' : 'ok'}
            </span>
            {item.status === 'ok' && item.actualConnectMethod && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {item.actualConnectMethod}
              </span>
            )}
          </div>
          <p className="m-0 text-xs text-text-tertiary truncate">{item.url}</p>
          {(item.name || item.version) && (
            <p className="m-0 text-xs text-text-secondary">
              {item.name ?? 'Unknown'} {item.version ? `• v${item.version}` : ''}
            </p>
          )}
          {item.error && <p className="m-0 text-xs text-error">{item.error}</p>}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Toggle checked={item.enabled} onChange={(v) => setEnabled(item.key, v)} label="Enable" />
            <span>Enable</span>
          </div>
          <button
            className="px-3 py-1.5 bg-transparent text-text-secondary border border-border-primary rounded-md text-xs font-medium cursor-pointer transition-all duration-150 hover:bg-bg-primary hover:text-text-primary hover:border-text-tertiary disabled:opacity-60"
            onClick={() => refreshServer(item.key)}
            disabled={isLoading}
          >
            Refresh
          </button>
        </div>
      </div>
      {Array.isArray(item.tools) && item.tools.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {item.tools.map((t: MCPToolInfo) => (
            <ToolBadge key={t.name} tool={t} />
          ))}
        </div>
      )}
      {item.lastUpdated && (
        <p className="m-0 text-[10px] text-text-tertiary">Updated {new Date(item.lastUpdated).toLocaleTimeString()}</p>
      )}
    </div>
  );
};

const SettingsMcpTab: React.FC = () => {
  const { rawJson, setRawJson, saveJson, servers, refreshAll, parsed, resetRawToParsed } = useMcpStore();
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const serverKeys = useMemo(() => Object.keys(servers), [servers]);

  useEffect(() => {
    setError(null);
  }, [rawJson]);

  const handleSave = async () => {
    setError(null);
    try {
      await saveJson();
      setIsEditing(false);
    } catch (e: any) {
      setError(e?.message || 'Invalid JSON');
    }
  };

  const handleRefreshAll = async () => {
    await refreshAll();
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {!isEditing && (
        <div className="flex items-center gap-2 mb-4 flex-shrink-0">
          <button
            className="px-4 py-2 bg-transparent text-text-secondary border border-border-primary rounded-md text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-bg-secondary hover:text-text-primary hover:border-text-tertiary"
            onClick={() => { resetRawToParsed(); setIsEditing(true); }}
          >
            Edit JSON
          </button>
          <button
            className="px-4 py-2 bg-transparent text-text-secondary border border-border-primary rounded-md text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-bg-secondary hover:text-text-primary hover:border-text-tertiary"
            onClick={handleRefreshAll}
            disabled={!parsed || serverKeys.length === 0}
          >
            Refresh All
          </button>
        </div>
      )}

      {isEditing && (
        <div className="flex flex-col h-full min-h-0">
          <div className="flex-1 min-h-0">
            <JsonEditor value={rawJson} onChange={setRawJson} error={error} />
          </div>
          <div className="flex items-center gap-2 mt-4 flex-shrink-0">
            <button
              className="px-4 py-2 bg-accent-primary text-text-inverse border-none rounded-md text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-accent-hover hover:-translate-y-px hover:shadow-sm active:scale-[0.98]"
              onClick={handleSave}
            >
              Save & Refresh
            </button>
            <button
              className="px-4 py-2 bg-transparent text-text-secondary border border-border-primary rounded-md text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-bg-secondary hover:text-text-primary hover:border-text-tertiary"
              onClick={() => { resetRawToParsed(); setIsEditing(false); setError(null); }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!isEditing && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="grid grid-cols-1 gap-3 pr-2">
            {serverKeys.length === 0 ? (
              <p className="m-0 text-sm text-text-tertiary">No MCP servers defined. Add them to the JSON and save.</p>) : (
              serverKeys.map((k) => <ServerCard key={k} serverKey={k} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsMcpTab;
