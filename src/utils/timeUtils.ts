import dayjs from 'dayjs';

export const formatTime = (date: Date): string => {
  return dayjs(date).format('hh:mm A');
};

export const formatChatDate = (date: Date): string => {
  const d = dayjs(date);
  const today = dayjs();

  if (d.isSame(today, 'day')) {
    // Match prior "today" behavior using 2-digit hour/minute (24h)
    return d.format('HH:mm');
  }

  if (d.isSame(today.subtract(1, 'day'), 'day')) {
    return 'Yesterday';
  }

  return d.format('MMM D');
};
