import React, { useState } from 'react';
import { FaCog, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { useModelStore, useChatData, useChatActions } from '../stores';
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

const ModelSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { models, selectedModelId, setSelectedModel, getSelectedModel } = useModelStore();
  const { activeChatId } = useChatData();
  const { updateChatMetadata } = useChatActions();
  const selectedModel = getSelectedModel();
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
    placement: 'top-start',
  });
  const click = useClick(context, { event: 'click', toggle: true });
  const dismiss = useDismiss(context, { outsidePress: true, escapeKey: true });
  const role = useRole(context, { role: 'menu' });
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role]);

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    if (activeChatId) {
      updateChatMetadata(activeChatId, { selectedModelId: modelId });
    }
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Interactions handled by floating-ui

  return (
    <div className="relative inline-block">
      <button
        className="flex items-center justify-between px-2 py-1 bg-bg-elevated border border-border-secondary rounded-full cursor-pointer transition-all duration-200 text-xs w-[90px] sm:w-[130px] gap-0.5 min-h-[24px] hover:bg-bg-secondary hover:border-border-hover focus:outline-none focus:border-accent-primary focus:shadow-[0_0_0_2px_var(--color-accent-light)]"
        onClick={toggleDropdown}
        ref={refs.setReference}
        {...getReferenceProps()}
        type="button"
      >
        <span className="font-medium text-text-primary whitespace-nowrap overflow-hidden text-ellipsis text-xs flex-1 min-w-0 leading-tight">
          {selectedModel?.name || (models.filter(model => model.isActive !== false).length > 0 ? 'No Model' : 'No Models')}
        </span>
        {isOpen ? <FaChevronUp size={7} /> : <FaChevronDown size={7} />}
      </button>

      {isOpen && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false} initialFocus={-1}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              className="min-w-[180px] bg-bg-elevated text-text-primary border border-border-secondary rounded-lg shadow-lg z-[9999] max-h-[300px] overflow-y-auto"
              {...getFloatingProps()}
            >
          {models.filter(model => model.isActive !== false).map((model, index, array) => (
            <div
              key={model.id}
              className={`flex items-center p-2 cursor-pointer transition-colors duration-200 gap-2 ${
                selectedModelId === model.id 
                  ? 'bg-accent-light text-accent-primary' 
                  : 'hover:bg-bg-secondary'
              } ${
                index === 0 ? 'rounded-t-lg' : ''
              } ${
                index === array.length - 1 ? 'rounded-b-lg' : ''
              }`}
              onClick={() => handleModelSelect(model.id)}
            >
              <div className="w-4 h-4 rounded-full bg-accent-primary flex items-center justify-center text-text-inverse text-xs overflow-hidden flex-shrink-0">
                <FaCog size={8} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium mb-0.5 text-xs">{model.name}</div>
                {model.description && (
                  <div className={`text-xs leading-snug ${
                    selectedModelId === model.id 
                      ? 'text-accent-primary opacity-80' 
                      : 'text-text-secondary'
                  }`}>
                    {model.description}
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

export default ModelSelector;
