const STATUS_STYLES = {
  'Open': {
    bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', dot: '#3B82F6',
  },
  'In Production': {
    bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0', dot: '#22C55E',
  },
  'Ready to Ship': {
    bg: '#F0F9FF', color: '#0369A1', border: '#BAE6FD', dot: '#38BDF8',
  },
  'In Transit': {
    bg: '#FFFBEB', color: '#B45309', border: '#FDE68A', dot: '#F59E0B',
  },
  'Received': {
    bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0', dot: '#16A34A',
  },
  'Not Fully Received': {
    bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', dot: '#EF4444',
  },
  'Received Partial': {
    bg: '#FAF5FF', color: '#7C3AED', border: '#DDD6FE', dot: '#8B5CF6',
  },
  'Cancelled': {
    bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB', dot: '#9CA3AF',
  },
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES['Open'];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: style.dot }} />
      {status}
    </span>
  );
}