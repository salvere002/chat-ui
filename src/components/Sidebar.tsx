import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Chat } from '../types/chat';
import { useChatActions } from '../stores';
import { FaCode, FaPlus } from 'react-icons/fa';
import { HiChevronDown, HiOutlineBars3, HiOutlineBars3BottomLeft } from 'react-icons/hi2';
import { formatChatDate } from '../utils/timeUtils';

interface SidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onChatSelected: (chatId: string) => void;
  onNewChat: (mode?: 'regular' | 'studio') => void;
  onDeleteChat: (chatId: string) => void;
  onClearAllChats: () => void;
  collapsed: boolean;
  onCollapse: () => void;
  maxHeight?: React.CSSProperties['maxHeight']; // Optional max-height constraint (e.g., "500px", "calc(100vh - 100px)")
  isVisible?: boolean; // For overlay mode - tracks if sidebar is visible to trigger animations
}

const Sidebar: React.FC<SidebarProps> = ({
  chats,
  activeChatId,
  onChatSelected,
  onNewChat,
  onDeleteChat,
  onClearAllChats,
  collapsed,
  onCollapse,
  maxHeight,
  isVisible = true
}) => {
  const dynamicHeight = maxHeight != null;
  const { renameChatSession } = useChatActions();
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingChatName, setEditingChatName] = useState('');
  const [showClearModal, setShowClearModal] = useState(false);
  const [showNewChatMenu, setShowNewChatMenu] = useState(false);
  const [studioCatalogExpanded, setStudioCatalogExpanded] = useState(true);
  const [conversationCatalogExpanded, setConversationCatalogExpanded] = useState(true);
  const newChatMenuRef = useRef<HTMLDivElement | null>(null);

  // Function to format the chat title or generate a default one
  const getChatTitle = (chat: Chat) => {
    // Check title first
    if (chat.title && chat.title.trim() !== '') {
      return chat.title;
    }

    // Then check name for backward compatibility
    if (chat.name && chat.name.trim() !== '') {
      return chat.name;
    }

    // Get the first user message, if any
    const firstUserMessage = chat.messages.find(msg => msg.sender === 'user');
    if (firstUserMessage && firstUserMessage.text) {
      // Truncate to first 30 chars if needed
      const text = firstUserMessage.text.trim();
      return text.length > 30 ? text.substring(0, 27) + '...' : text;
    }

    // Fallback to a default name
    const chatIndex = chats.findIndex((item) => item.id === chat.id);
    if (chatIndex >= 0) {
      return `Chat ${chats.length - chatIndex}`;
    }
    return `Chat ${chats.length}`;
  };

  // Start editing a chat title
  const startEditing = (chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    // Use the display title for editing
    const displayTitle = getChatTitle(chat);
    setEditingChatName(displayTitle);
  };

  // Save the edited chat title
  const saveEditedName = () => {
    if (editingChatId && editingChatName.trim() !== '') {
      renameChatSession(editingChatId, editingChatName);
      setEditingChatId(null);
      setEditingChatName('');
    }
  };

  // Handle Enter key to save and Escape key to cancel
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEditedName();
    } else if (e.key === 'Escape') {
      setEditingChatId(null);
      setEditingChatName('');
    }
  };

  // Handle input blur to save changes
  const handleBlur = () => {
    saveEditedName();
  };

  // Handle clear all conversations - show confirmation modal
  const handleClearAll = () => {
    setShowClearModal(true);
  };

  // Confirm clear all conversations
  const confirmClearAll = () => {
    onClearAllChats();
    setShowClearModal(false);
  };

  // Cancel clear all
  const cancelClearAll = () => {
    setShowClearModal(false);
  };

  useEffect(() => {
    if (!showNewChatMenu) return;
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (newChatMenuRef.current && !newChatMenuRef.current.contains(target)) {
        setShowNewChatMenu(false);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, [showNewChatMenu]);

  useEffect(() => {
    if (collapsed && showNewChatMenu) {
      setShowNewChatMenu(false);
    }
  }, [collapsed, showNewChatMenu]);

  const studioChats = useMemo(
    () => chats.filter((chat) => Boolean(chat.studioEnabled)),
    [chats]
  );
  const conversationChats = useMemo(
    () => chats.filter((chat) => !chat.studioEnabled),
    [chats]
  );
  const hasAnyChats = chats.length > 0;
  const shouldHideChatItems = dynamicHeight ? !isVisible : collapsed;
  const studioVisibleCount = studioCatalogExpanded ? studioChats.length : 0;
  const conversationVisibleCount = conversationCatalogExpanded ? conversationChats.length : 0;
  const visibleChatCount = studioVisibleCount + conversationVisibleCount;

  const renderChatItems = (sectionChats: Chat[], startIndex: number) => (
    sectionChats.map((chat, index) => {
      const animationIndex = startIndex + index;
      return (
        <div
          key={chat.id}
          className={`group flex items-center gap-3 p-3 mb-2 bg-bg-elevated border border-transparent rounded-md cursor-pointer transition-all duration-150 relative overflow-hidden hover:bg-bg-tertiary hover:border-border-secondary hover:translate-x-0.5 min-w-[220px] ${chat.id === activeChatId ? 'bg-accent-light border-accent-primary before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-accent-primary' : ''
            }`}
          style={{
            // Avoid delaying color/background transitions (theme switch should be instant)
            transition: 'opacity 260ms ease-out, transform 260ms ease-out',
            transitionDelay: shouldHideChatItems ? '0ms' : `${300 + animationIndex * 25}ms`,
            opacity: shouldHideChatItems ? 0 : 1,
            transform: shouldHideChatItems ? 'translateY(4px)' : 'translateY(0)',
            willChange: 'opacity, transform'
          }}
          onClick={() => onChatSelected(chat.id)}
        >
          <div className="flex-1 min-w-0 max-w-[180px]">
            {editingChatId === chat.id ? (
              <div className="w-full">
                <input
                  type="text"
                  value={editingChatName}
                  onChange={(e) => setEditingChatName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleBlur}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                  className="w-full px-2 py-1 bg-bg-elevated text-text-primary border border-border-focus rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent-light"
                />
              </div>
            ) : (
              <>
                <div
                  className="text-sm font-medium text-text-primary truncate leading-tight cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis"
                  onDoubleClick={(e) => startEditing(chat, e)}
                >
                  {getChatTitle(chat)}
                </div>
                <div className="text-xs text-text-tertiary mt-1 leading-tight whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-1">
                  {chat.status === 'loading' ? (
                    <span className="animate-pulse text-accent-primary">Loading...</span>
                  ) : (
                    formatChatDate(chat.updatedAt)
                  )}
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            {editingChatId !== chat.id && (
              <button
                className="flex items-center justify-center w-6 h-6 p-0 bg-transparent border-none rounded text-text-tertiary cursor-pointer transition-all duration-150 hover:bg-bg-tertiary hover:text-accent-primary active:scale-90"
                onClick={(e) => startEditing(chat, e)}
                aria-label="Edit chat name"
              >
                ✎
              </button>
            )}
            <button
              className="flex items-center justify-center w-6 h-6 p-0 bg-transparent border-none rounded text-text-tertiary cursor-pointer transition-all duration-150 hover:bg-error hover:text-text-inverse active:scale-90"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteChat(chat.id);
              }}
              aria-label="Delete chat"
            >
              ×
            </button>
          </div>
        </div>
      );
    })
  );

  return (
    <>
      <div className={`flex flex-col ${collapsed ? 'w-0 lg:w-[60px]' : 'w-[280px] sm:w-[300px] lg:w-[280px]'} min-w-0 ${dynamicHeight ? 'h-auto' : 'h-full'} bg-bg-secondary border-r border-border-primary flex-shrink-0 transition-[width] duration-300 ease-in-out`} style={{ willChange: 'width', contain: 'layout paint', maxHeight }}>
        <div className={`w-full ${dynamicHeight ? 'h-auto' : 'h-full'} flex flex-col overflow-hidden`}>
          <div className="relative z-20 bg-bg-secondary border-b border-border-primary border-r border-border-primary overflow-visible flex-shrink-0">
            <div className="p-4 relative" style={{ height: '112px' }}>
              {/* Header row - absolutely positioned when collapsed to not affect layout */}
              <div className={`flex items-center w-full transition-opacity duration-150 ease-in-out ${collapsed
                  ? 'absolute top-4 left-4 right-4 opacity-0 pointer-events-none'
                  : 'opacity-100 mb-3'
                }`} style={{ height: '32px' }}>
                <h2 className="text-lg font-semibold text-text-primary m-0 whitespace-nowrap">Conversations</h2>
              </div>

              {/* Collapse icon for expanded state - fixed to top-right */}
              <button
                className={`hidden lg:flex items-center justify-center w-8 h-8 p-0 bg-transparent text-text-tertiary border-none rounded-md cursor-w-resize transition-colors duration-150 ease-in-out hover:bg-bg-tertiary hover:text-accent-primary ${collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
                  }`}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  transition: 'opacity 150ms ease-in-out',
                  willChange: 'opacity',
                  transform: 'translateZ(0)'
                }}
                onClick={onCollapse}
                aria-label="Collapse sidebar"
                title="Collapse Sidebar"
              >
                <HiOutlineBars3BottomLeft className="w-7 h-7" />
              </button>

              {/* Collapse icon for collapsed state - centered horizontally */}
              <button
                className={`hidden lg:flex items-center justify-center w-8 h-8 p-0 bg-transparent text-text-tertiary border-none rounded-md cursor-e-resize transition-colors duration-150 ease-in-out hover:bg-bg-tertiary hover:text-accent-primary ${collapsed ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                style={{
                  position: 'absolute',
                  top: '16px',
                  left: '16px',
                  transition: 'opacity 200ms ease-in-out',
                  willChange: 'opacity',
                  transform: 'translateZ(0)'
                }}
                onClick={onCollapse}
                aria-label="Expand sidebar"
                title="Expand Sidebar"
              >
                <HiOutlineBars3 className="w-7 h-7" />
              </button>

              {/* New Chat split button */}
              <div
                ref={newChatMenuRef}
                style={{
                  position: 'absolute',
                  top: '56px',
                  left: '16px',
                  transform: collapsed ? 'translateX(0)' : 'translateX(24px)',
                  width: collapsed ? '32px' : '200px',
                  minWidth: '32px',
                  transition: 'width 300ms ease-out, transform 300ms ease-out',
                  willChange: 'transform, width'
                }}
              >
                <div className="flex items-stretch w-full">
                  <button
                    className={`flex items-center bg-accent-primary text-text-inverse border-none cursor-pointer hover:bg-accent-hover hover:-translate-y-px hover:shadow-sm active:scale-[0.98] text-sm ${collapsed
                      ? 'w-full h-8 p-0 rounded-md justify-center'
                      : 'px-3 py-2 font-medium justify-center rounded-l-md flex-1'
                      }`}
                    onClick={() => {
                      setShowNewChatMenu(false);
                      onNewChat('regular');
                    }}
                    aria-label="Start new regular chat"
                    title="New Chat"
                  >
                    <FaPlus
                      className="text-sm flex-shrink-0"
                      style={{
                        transition: 'margin-right 300ms ease-out',
                        marginRight: collapsed ? '0' : '8px'
                      }}
                    />
                    <span
                      className={`whitespace-nowrap ${collapsed ? 'opacity-0 w-0 overflow-hidden ml-0' : 'opacity-100 w-auto ml-0'}`}
                      style={{
                        transition: 'opacity 150ms ease-out, width 300ms ease-out',
                        transitionDelay: collapsed ? '0ms' : '150ms'
                      }}
                    >
                      New Chat
                    </span>
                  </button>
                  <button
                    className={`bg-accent-primary text-text-inverse rounded-r-md cursor-pointer hover:bg-accent-hover active:scale-[0.98] flex items-center justify-center border-l border-white/20 ${collapsed ? 'w-0 opacity-0 pointer-events-none border-l-0' : 'w-9 opacity-100'
                      }`}
                    style={{
                      transition: 'width 300ms ease-out, opacity 150ms ease-out'
                    }}
                    onClick={() => setShowNewChatMenu((prev) => !prev)}
                    aria-label="New chat options"
                    title="New chat options"
                  >
                    <HiChevronDown className={`w-4 h-4 transition-transform duration-150 ${showNewChatMenu ? 'rotate-180' : 'rotate-0'}`} />
                  </button>
                </div>

                {!collapsed && showNewChatMenu && (
                  <div className="absolute top-full right-0 mt-2 w-[200px] bg-bg-elevated border border-border-primary rounded-md shadow-lg z-tooltip overflow-hidden">
                    <button
                      className="w-full px-3 py-2 text-sm text-left text-text-primary hover:bg-bg-tertiary transition-colors flex items-center gap-2"
                      onClick={() => {
                        setShowNewChatMenu(false);
                        onNewChat('studio');
                      }}
                    >
                      <FaCode className="text-accent-primary flex-shrink-0" />
                      <span>New Studio</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="relative z-0 flex-1 border-r border-border-primary min-h-0 flex flex-col">
            {/* Conversation list - always rendered; items handle their own fade */}
            <div
              className={`flex-1 overflow-y-auto overflow-x-hidden p-2 min-h-0 flex flex-col ${collapsed ? 'pointer-events-none' : ''}`}
              style={{
                contain: 'paint',
                contentVisibility: 'auto'
              }}
            >
              {!collapsed && (
                <>
                  <div className="min-w-[240px] w-full flex-1">
                    {!hasAnyChats ? (
                      <div className="flex items-center justify-center px-4 py-6 text-text-tertiary text-sm text-center opacity-60 min-w-[200px]">
                        <span className="leading-relaxed">
                          No conversations
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {studioChats.length > 0 && (
                          <section>
                            <button
                              type="button"
                              onClick={() => setStudioCatalogExpanded((prev) => !prev)}
                              className="w-full flex items-center justify-between px-1 py-1.5 text-left text-text-secondary hover:text-text-primary transition-colors"
                              aria-expanded={studioCatalogExpanded}
                              aria-label="Toggle studios catalog"
                            >
                              <span className="flex items-center gap-2">
                                <span className="text-xs font-semibold uppercase tracking-wide">Studios</span>
                                <span className="text-[11px] text-text-tertiary">({studioChats.length})</span>
                              </span>
                              <HiChevronDown className={`w-4 h-4 transition-transform duration-150 ${studioCatalogExpanded ? 'rotate-0' : '-rotate-90'}`} />
                            </button>
                            {studioCatalogExpanded && (
                              <div className="pt-1">
                                {renderChatItems(studioChats, 0)}
                              </div>
                            )}
                          </section>
                        )}

                        {conversationChats.length > 0 && (
                          <section>
                            <button
                              type="button"
                              onClick={() => setConversationCatalogExpanded((prev) => !prev)}
                              className="w-full flex items-center justify-between px-1 py-1.5 text-left text-text-secondary hover:text-text-primary transition-colors"
                              aria-expanded={conversationCatalogExpanded}
                              aria-label="Toggle conversations catalog"
                            >
                              <span className="flex items-center gap-2">
                                <span className="text-xs font-semibold uppercase tracking-wide">Conversations</span>
                                <span className="text-[11px] text-text-tertiary">({conversationChats.length})</span>
                              </span>
                              <HiChevronDown className={`w-4 h-4 transition-transform duration-150 ${conversationCatalogExpanded ? 'rotate-0' : '-rotate-90'}`} />
                            </button>
                            {conversationCatalogExpanded && (
                              <div className="pt-1">
                                {renderChatItems(conversationChats, studioVisibleCount)}
                              </div>
                            )}
                          </section>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Clear All Button - Inside scrollable area */}
                  {chats.length > 0 && (
                    <div
                      className="p-3 mt-2 flex-shrink-0 relative"
                      style={{ height: '52px' }}
                    >
                      <button
                        onClick={handleClearAll}
                        className="absolute inset-x-3 top-3 bottom-3 text-xs font-medium rounded-md flex items-center justify-center gap-2 bg-transparent text-text-tertiary border border-border-primary hover:bg-bg-tertiary hover:text-error hover:border-error transition-opacity duration-300 ease-in-out opacity-100"
                        style={{
                          transitionDelay: `${300 + visibleChatCount * 25 + 100}ms`
                        }}
                        title="Clear all conversations"
                      >
                        <span className="text-xs">🗑️</span>
                        <span
                          className="whitespace-nowrap text-xs opacity-100 w-auto"
                          style={{
                            transition: 'opacity 150ms ease-out, width 300ms ease-out',
                            transitionDelay: '150ms'
                          }}
                        >
                          Clear All
                        </span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-tooltip p-4 animate-fade-in">
          <div className="bg-bg-elevated rounded-lg w-full max-w-[400px] shadow-lg flex flex-col animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 bg-bg-secondary border-b border-border-primary rounded-t-lg">
              <h3 className="text-lg font-semibold text-text-primary m-0">Clear All Conversations</h3>
            </div>

            <div className="p-6">
              <p className="text-text-secondary mb-6 leading-relaxed">
                Are you sure you want to delete all conversations? This action cannot be undone and will permanently remove all your chat history.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={cancelClearAll}
                  className="px-4 py-2 bg-transparent text-text-secondary border border-border-primary rounded-md text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-bg-secondary hover:text-text-primary hover:border-text-tertiary"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmClearAll}
                  className="px-4 py-2 bg-error text-text-inverse border-none rounded-md text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-red-600 hover:-translate-y-px hover:shadow-sm active:scale-[0.98]"
                >
                  Delete All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
