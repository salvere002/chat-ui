import React, { useState } from 'react';
import { FaUser, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { useAgentStore, useChatData, useChatActions } from '../stores';
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  FloatingFocusManager,
} from '@floating-ui/react';

const AgentSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    deepResearchEnabled, 
    setSelectedAgent, 
    getEffectiveAgent, 
    getSelectableAgents 
  } = useAgentStore();
  const { activeChatId } = useChatData();
  const { updateChatMetadata } = useChatActions();
  const displayAgent = getEffectiveAgent();
  const selectableAgents = getSelectableAgents();
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
    placement: 'top-start',
  });

  const click = useClick(context, { event: 'click', toggle: true, ignoreMouse: false });
  const dismiss = useDismiss(context, { outsidePress: true, escapeKey: true });
  const role = useRole(context, { role: 'menu' });
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role]);

  const handleAgentSelect = (agentId: string) => {
    setSelectedAgent(agentId);
    if (activeChatId) {
      updateChatMetadata(activeChatId, { selectedAgentId: agentId });
    }
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    if (deepResearchEnabled) return; // Disable dropdown in deep research mode
    setIsOpen((v) => !v);
  };

  return (
    <div className="relative inline-block">
      <button
        className={`flex items-center justify-between px-2 py-1 bg-bg-elevated border border-border-secondary rounded-full transition-all duration-200 text-xs w-[90px] sm:w-[130px] gap-0.5 min-h-[24px] focus:outline-none focus:border-accent-primary focus:shadow-[0_0_0_2px_var(--color-accent-light)] ${
          deepResearchEnabled 
            ? 'cursor-default opacity-60' 
            : 'cursor-pointer hover:bg-bg-secondary hover:border-border-hover'
        }`}
        onClick={toggleDropdown}
        ref={refs.setReference}
        {...getReferenceProps()}
        type="button"
        disabled={deepResearchEnabled}
      >
        <span className="font-medium text-text-primary whitespace-nowrap overflow-hidden text-ellipsis text-xs flex-1 min-w-0 leading-tight">
          {displayAgent?.name || (selectableAgents.length > 0 ? 'No Agent' : 'No Agents')}
        </span>
        {!deepResearchEnabled && (isOpen ? <FaChevronUp size={7} /> : <FaChevronDown size={7} />)}
      </button>

      {isOpen && !deepResearchEnabled && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false} initialFocus={-1}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              className="min-w-[180px] bg-bg-elevated text-text-primary border border-border-secondary rounded-lg shadow-lg z-[9999] max-h-[300px] overflow-y-auto"
              {...getFloatingProps()}
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
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </div>
  );
};

export default AgentSelector;
