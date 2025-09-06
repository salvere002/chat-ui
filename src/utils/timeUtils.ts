export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

export const formatChatDate = (date: Date): string => {
  const today = new Date();
  const chatDate = new Date(date);
  
  // Check if today
  if (
    chatDate.getDate() === today.getDate() &&
    chatDate.getMonth() === today.getMonth() &&
    chatDate.getFullYear() === today.getFullYear()
  ) {
    return chatDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Check if yesterday
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (
    chatDate.getDate() === yesterday.getDate() &&
    chatDate.getMonth() === yesterday.getMonth() &&
    chatDate.getFullYear() === yesterday.getFullYear()
  ) {
    return 'Yesterday';
  }
  
  // Otherwise show the date
  return chatDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
};