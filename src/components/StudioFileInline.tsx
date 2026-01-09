import React from 'react';
import { FaFileCode, FaChevronRight } from 'react-icons/fa';
import { useChatData, useStudioActions } from '../stores';

interface StudioFileInlineProps {
  fileName: string;
}

const StudioFileInline: React.FC<StudioFileInlineProps> = ({ fileName }) => {
  const { activeChatId } = useChatData();
  const { setActiveFile, setPanelCollapsed } = useStudioActions();

  const handleClick = () => {
    if (!activeChatId) return;
    setActiveFile(activeChatId, fileName);
    setPanelCollapsed(activeChatId, false);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-2 px-3 py-2 my-2 bg-bg-secondary border border-border-secondary rounded-md text-text-primary text-sm hover:bg-bg-tertiary hover:border-border-primary transition-colors"
      title={`Open ${fileName} in Studio`}
    >
      <FaFileCode className="text-accent-primary" />
      <span className="font-medium">{fileName}</span>
      <FaChevronRight className="text-xs text-text-tertiary" />
    </button>
  );
};

export default StudioFileInline;
