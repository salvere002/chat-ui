import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaChevronDown, FaChevronLeft, FaChevronRight, FaFileCode } from 'react-icons/fa';
import { StudioFile } from '../types/studio';
import useStudioStore from '../stores/studioStore';
import CodeEditor from './MessageItem/CodeEditor';

interface StudioPanelProps {
  chatId: string;
  /** When true, editor and preview show side-by-side instead of toggle */
  splitView?: boolean;
}

const languageFromFileName = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    js: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    json: 'json',
    html: 'html',
    css: 'css',
    scss: 'scss',
    md: 'markdown',
    yml: 'yaml',
    yaml: 'yaml',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    sh: 'bash',
  };
  return map[ext] || 'text';
};

const StudioPanel: React.FC<StudioPanelProps> = ({ chatId, splitView = false }) => {
  const chatState = useStudioStore((state) => state.chats[chatId]);
  const {
    setActiveFile,
    setActiveVersion,
    setPanelCollapsed,
    updateFileContent,
  } = useStudioStore.getState();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const files = useMemo(() => {
    if (!chatState) return [];
    return chatState.order
      .map((name) => chatState.files[name])
      .filter(Boolean) as StudioFile[];
  }, [chatState]);

  const activeFileName = chatState?.activeFileName || files[0]?.name;
  const activeFile = activeFileName ? chatState?.files[activeFileName] : undefined;
  const activeVersion = activeFile
    ? activeFile.versions.find(v => v.id === activeFile.activeVersionId) || activeFile.versions[activeFile.versions.length - 1]
    : undefined;
  const panelCollapsed = chatState?.panelCollapsed ?? false;

  useEffect(() => {
    if (!chatState || !files.length) return;
    if (!activeFileName) {
      setActiveFile(chatId, files[0].name);
    }
  }, [chatState, files, activeFileName, chatId, setActiveFile]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const fileLabel = activeFileName || 'Select file';
  const fileLanguage = activeFile?.language || (activeFile ? languageFromFileName(activeFile.name) : 'text');

  // Collapsed state: compact file list floating above chat
  if (panelCollapsed) {
    return (
      <div className="absolute top-2 right-2 z-dropdown w-48 border border-border-secondary bg-bg-secondary rounded-lg shadow-lg flex flex-col transition-all duration-200">
        {/* Header with expand button */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border-secondary bg-bg-tertiary rounded-t-lg">
          <span className="text-xs font-medium text-text-secondary">Files</span>
          <button
            type="button"
            onClick={() => setPanelCollapsed(chatId, false)}
            className="flex items-center justify-center w-6 h-6 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
            title="Expand studio panel"
          >
            <FaChevronLeft className="text-xs" />
          </button>
        </div>

        {/* Compact file list */}
        <div className="py-1 max-h-[300px] overflow-y-auto">
          {files.map((file) => (
            <button
              key={file.name}
              type="button"
              onClick={() => {
                setActiveFile(chatId, file.name);
                setPanelCollapsed(chatId, false);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-bg-tertiary transition-colors truncate flex items-center gap-2 ${file.name === activeFileName ? 'text-accent-primary font-medium' : 'text-text-primary'}`}
              title={file.name}
            >
              <FaFileCode className="text-accent-primary flex-shrink-0 text-[10px]" />
              <span className="truncate">{file.name}</span>
            </button>
          ))}
          {files.length === 0 && (
            <div className="px-3 py-2 text-xs text-text-tertiary">
              No files yet
            </div>
          )}
        </div>
      </div>
    );
  }

  // Expanded state: full panel with editor
  return (
    <div className="w-1/2 h-full border-l border-border-secondary bg-bg-secondary flex flex-col transition-all duration-200">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-secondary bg-bg-tertiary">
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-border-secondary bg-bg-secondary text-text-primary hover:bg-bg-primary transition-colors"
            title="Open file list"
          >
            <FaFileCode className="text-accent-primary" />
            <span className="text-sm font-medium truncate max-w-[180px]">{fileLabel}</span>
            <FaChevronDown className="text-xs text-text-tertiary" />
          </button>

          {menuOpen && (
            <div className="absolute top-full left-0 mt-2 w-56 bg-bg-primary border border-border-secondary rounded-md shadow-lg z-dropdown">
              <div className="py-1 max-h-[240px] overflow-y-auto">
                {files.map((file) => (
                  <button
                    key={file.name}
                    type="button"
                    onClick={() => {
                      setActiveFile(chatId, file.name);
                      setMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-bg-tertiary transition-colors ${file.name === activeFileName ? 'text-accent-primary font-medium' : 'text-text-primary'}`}
                  >
                    {file.name}
                  </button>
                ))}
                {files.length === 0 && (
                  <div className="px-3 py-2 text-sm text-text-tertiary">
                    No files yet
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeFile && activeFile.versions.length > 1 && activeVersion && (
            <select
              value={activeVersion.id}
              onChange={(event) => setActiveVersion(chatId, activeFile.name, event.target.value)}
              className="px-2 py-1 text-xs bg-bg-secondary border border-border-secondary rounded-md text-text-primary"
            >
              {activeFile.versions.map((version, index) => (
                <option key={version.id} value={version.id}>
                  v{index + 1}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => setPanelCollapsed(chatId, true)}
            className="flex items-center justify-center w-7 h-7 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
            title="Collapse studio panel"
          >
            <FaChevronRight />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {activeFile && activeVersion ? (
          <CodeEditor
            code={activeVersion.content}
            language={fileLanguage}
            onSave={(newCode) => updateFileContent(chatId, activeFile.name, activeVersion.id, newCode)}
            onClose={() => setPanelCollapsed(chatId, true)}
            variant="panel"
            commitOnSave={true}
            showCloseButton={false}
            splitView={splitView}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-text-tertiary">
            No file selected
          </div>
        )}
      </div>
    </div>
  );
};

export default StudioPanel;
