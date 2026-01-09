export const formatRelativeTime = (value: string) => {
  const diff = Date.now() - new Date(value).getTime();
  if (diff < 60 * 1000) return 'Just now';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m ago`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}h ago`;
  return `${Math.floor(diff / (24 * 60 * 60 * 1000))}d ago`;
};
