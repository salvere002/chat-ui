import React, { useState, useRef, useEffect } from 'react';
import { FaUser, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { useAgentStore } from '../stores';

const AgentSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    deepResearchEnabled, 
    setSelectedAgent, 
    getDisplayAgent, 
    getSelectableAgents 
  } = useAgentStore();
  const displayAgent = getDisplayAgent();
  const selectableAgents = getSelectableAgents();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleAgentSelect = (agentId: string) => {
    setSelectedAgent(agentId);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    if (deepResearchEnabled) return; // Disable dropdown in deep research mode
    setIsOpen(!isOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        className={`flex items-center justify-between px-2 py-1 bg-bg-primary border border-border-secondary rounded-full transition-all duration-200 text-xs w-[130px] gap-0.5 min-h-[24px] focus:outline-none focus:border-accent-primary focus:shadow-[0_0_0_2px_var(--color-accent-light)] ${
          deepResearchEnabled 
            ? 'cursor-default opacity-60' 
            : 'cursor-pointer hover:bg-bg-secondary hover:border-border-hover'
        }`}
        onClick={toggleDropdown}
        type="button"
        disabled={deepResearchEnabled}
      >
        <span className="font-medium text-text-primary whitespace-nowrap overflow-hidden text-ellipsis text-xs flex-1 min-w-0 leading-tight">
          {displayAgent?.name || (selectableAgents.length > 0 ? 'No Agent' : 'No Agents')}
        </span>
        {!deepResearchEnabled && (isOpen ? <FaChevronUp size={7} /> : <FaChevronDown size={7} />)}
      </button>

      {isOpen && !deepResearchEnabled && (
        <div 
          className="absolute bottom-full left-0 mb-1 min-w-[180px] bg-bg-primary border border-border-secondary rounded-lg shadow-lg z-[9999] max-h-[300px] overflow-y-auto"
        >
          {selectableAgents.map((agent, index, array) => (
            <div
              key={agent.id}
              className={`flex items-center p-2 cursor-pointer transition-colors duration-200 gap-2 ${
                displayAgent?.id === agent.id 
                  ? 'bg-accent-light text-accent-primary' 
                  : 'hover:bg-bg-secondary'
              } ${
                index === 0 ? 'rounded-t-lg' : ''
              } ${
                index === array.length - 1 ? 'rounded-b-lg' : ''
              }`}
              onClick={() => handleAgentSelect(agent.id)}
            >
              <div className="w-4 h-4 rounded-full bg-accent-primary flex items-center justify-center text-text-inverse text-xs overflow-hidden flex-shrink-0">
                {agent.avatar ? (
                  <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
                ) : (
                  <FaUser size={8} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium mb-0.5 text-xs">{agent.name}</div>
                {agent.description && (
                  <div className={`text-xs leading-snug ${
                    displayAgent?.id === agent.id 
                      ? 'text-accent-primary opacity-80' 
                      : 'text-text-secondary'
                  }`}>
                    {agent.description}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AgentSelector;