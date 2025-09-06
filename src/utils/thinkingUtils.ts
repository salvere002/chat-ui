export const createThinkingUpdateData = (
  currentThinking: string | undefined,
  newThinking: string,
  isComplete: boolean,
  currentCollapsed?: boolean
) => ({
  thinkingContent: `${currentThinking || ''}${newThinking}`,
  isThinkingComplete: isComplete,
  thinkingCollapsed: currentCollapsed ?? true
});