import { X } from 'lucide-react';
import SizeBreakdownGrid, { rollupBreakdown } from './SizeBreakdownGrid';

const BORDER = '#D8E3F8';
const BLUE = '#2563EB';
const MUTED = '#6B7BAE';

export default function SizeBreakdownModal({ breakdown, onChange, onClose, isReceiving = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,42,74,0.4)' }}>
      <div className="flex flex-col rounded-xl shadow-2xl" style={{ background: '#fff', border: `1px solid ${BORDER}`, width: 520, maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0" style={{ borderColor: BORDER, background: '#F0F5FF', borderRadius: '12px 12px 0 0' }}>
          <div>
            <span className="text-sm font-semibold" style={{ color: '#1E2A4A' }}>Size Quantities (GOWN STOCK)</span>
            <span className="ml-3 text-xs" style={{ color: MUTED }}>{isReceiving ? 'Enter Received per size' : 'Enter Req & Sent per size'}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-blue-100 transition-colors" style={{ color: MUTED }}>
            <X size={16} />
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <SizeBreakdownGrid breakdown={breakdown} onChange={onChange} showSent={!isReceiving} showReceived={isReceiving} />
        </div>

        {/* Footer totals + done */}
        <div className="flex items-center justify-between px-5 py-3 border-t flex-shrink-0" style={{ borderColor: BORDER, background: '#F7F9FF', borderRadius: '0 0 12px 12px' }}>
          <div className="flex gap-5">
            <span className="text-xs" style={{ color: MUTED }}>
              Total Req: <strong style={{ color: '#1E2A4A' }}>{rollupBreakdown(breakdown, 'qty_requested') || 0}</strong>
            </span>
            {!isReceiving && (
              <span className="text-xs" style={{ color: MUTED }}>
                Total Sent: <strong style={{ color: '#B45309' }}>{rollupBreakdown(breakdown, 'qty_sent') || 0}</strong>
              </span>
            )}
            {isReceiving && (
              <span className="text-xs" style={{ color: MUTED }}>
                Total Received: <strong style={{ color: '#15803D' }}>{rollupBreakdown(breakdown, 'qty_received') || 0}</strong>
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold"
            style={{ background: BLUE, color: '#fff' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}