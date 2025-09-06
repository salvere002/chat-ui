export const generateId = (prefix: string, len = 7): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 2 + len)}`;
};

export const generateMessageId = (): string => generateId('msg');
export const generateChatId = (): string => generateId('chat');
export const generateBranchId = (): string => generateId('branch');

