import React from 'react';
import { FaSearch } from 'react-icons/fa';
import { useAgentStore } from '../stores';

const DeepResearchToggle: React.FC = () => {
  const { deepResearchEnabled, setDeepResearchEnabled } = useAgentStore();

  const handleToggle = () => {
    setDeepResearchEnabled(!deepResearchEnabled);
  };

  return (
    <button
      className={`flex items-center justify-center px-2 py-1 border rounded-full cursor-pointer transition-all duration-200 text-xs w-[90px] sm:w-[130px] gap-1 min-h-[24px] focus:outline-none focus:shadow-[0_0_0_2px_var(--color-accent-light)] ${
        deepResearchEnabled
          ? 'bg-accent-primary border-accent-primary text-text-inverse hover:bg-accent-hover'
          : 'bg-bg-elevated border-border-secondary text-text-primary hover:bg-bg-secondary hover:border-border-hover'
      }`}
      onClick={handleToggle}
      type="button"
      title={deepResearchEnabled ? 'Disable Deep Research' : 'Enable Deep Research'}
    >
      <FaSearch size={8} />
      <span className="font-medium whitespace-nowrap overflow-hidden text-ellipsis text-xs flex-1 min-w-0 leading-tight">
        <span className="hidden sm:inline">Deep Research</span>
        <span className="sm:hidden">Deep</span>
      </span>
    </button>
  );
};

export default DeepResearchToggle;