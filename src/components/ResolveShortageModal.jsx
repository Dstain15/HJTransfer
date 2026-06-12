import { useState } from 'react';
import { X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const BORDER = '#D8E3F8';
const TEXT = '#1E2A4A';
const MUTED = '#6B7BAE';

// Compute shortage: per-size for breakdowns, otherwise simple diff
function computeShortage(row) {
  if (row.size_breakdown?.length > 0) {
    const sizes = row.size_breakdown
      .map(s => ({ size: s.size, diff: Math.max((s.qty_sent || 0) - (s.qty_received || 0), 0) }))
      .filter(s => s.diff > 0);
    return { total: sizes.reduce((sum, s) => sum + s.diff, 0), sizes };
  }
  return { total: Math.max((row.qty_sent || 0) - (row.qty_received || 0), 0), sizes: null };
}

export default function ResolveShortageModal({ row, onClose, onResolved }) {
  const [saving, setSaving] = useState(false);
  const shortage = computeShortage(row);

  const handleConfirm = async () => {
    setSaving(true);
    // Build new shortage request
    const newReq = {
      request_id: `${row.request_id || 'TR'}-SHORT`,
      sales_orders: row.sales_orders || (row.sales_order_number ? [row.sales_order_number] : []),
      sales_order_number: row.sales_order_number,
      wip_numbers: row.wip_numbers || [],
      date_logged: new Date().toISOString().split('T')[0],
      customer_request_date: row.customer_request_date,
      order_type: row.order_type,
      item_type: row.item_type,
      item_code: row.item_code,
      item_notes: `Shortage re-request from ${row.request_id || row.item_code} (PL# ${row.pl_number || '—'})`,
      qty_requested: shortage.total,
      status: 'Open',
      missed_shortage: true,
      shortage_of_request_id: row.request_id || row.id,
    };
    if (shortage.sizes) {
      newReq.size_breakdown = shortage.sizes.map(s => ({ size: s.size, qty_requested: s.diff }));
    }
    await base44.entities.TransferRequest.create(newReq);
    await base44.entities.TransferRequest.update(row.id, { status: 'Received Partial' });
    toast.success(`Shortage request created for ${shortage.total} unit(s) — original marked resolved`);
    setSaving(false);
    onResolved();
  };

  const handleNoRequest = async () => {
    setSaving(true);
    await base44.entities.TransferRequest.update(row.id, { status: 'Received Partial' });
    toast.success('Marked as Received Partial');
    setSaving(false);
    onResolved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(30,42,74,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-xl shadow-2xl w-96" style={{ background: '#fff', border: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: BORDER, background: '#FFF7ED', borderRadius: '12px 12px 0 0' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} style={{ color: '#EA580C' }} />
            <span className="text-sm font-semibold" style={{ color: TEXT }}>Resolve Shortage</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-orange-100" style={{ color: MUTED }}>
            <X size={14} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-3">
          <div className="px-3 py-2 rounded text-xs" style={{ background: '#F7F9FF', border: `1px solid ${BORDER}` }}>
            <span className="font-mono font-semibold" style={{ color: TEXT }}>{row.item_code}</span>
            <span className="ml-2" style={{ color: MUTED }}>{row.request_id}</span>
          </div>

          <div className="text-xs" style={{ color: TEXT }}>
            <p className="mb-1">Unreceived difference: <strong style={{ color: '#DC2626' }}>{shortage.total} unit(s)</strong></p>
            {shortage.sizes && (
              <div className="flex flex-wrap gap-1 mt-1">
                {shortage.sizes.map(s => (
                  <span key={s.size} className="px-1.5 py-0.5 rounded font-mono" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', fontSize: 10 }}>
                    {s.size}: {s.diff}
                  </span>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs" style={{ color: MUTED }}>
            Create a new line item request for the unreceived difference? The original line will be marked
            <strong style={{ color: TEXT }}> Received Partial</strong>, and the new request will be flagged as a missed shortage.
          </p>
        </div>

        <div className="flex gap-2 px-4 py-3 border-t justify-end" style={{ borderColor: BORDER, background: '#F7F9FF', borderRadius: '0 0 12px 12px' }}>
          <button onClick={onClose} disabled={saving}
            className="px-3 py-1.5 rounded text-xs font-medium"
            style={{ background: '#EEF2FF', color: MUTED, border: `1px solid ${BORDER}` }}>
            Cancel
          </button>
          <button onClick={handleNoRequest} disabled={saving}
            className="px-3 py-1.5 rounded text-xs font-semibold"
            style={{ background: '#fff', color: TEXT, border: `1px solid ${BORDER}` }}>
            Resolve Only
          </button>
          <button onClick={handleConfirm} disabled={saving || shortage.total === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold"
            style={{ background: '#2563EB', color: '#fff', opacity: saving || shortage.total === 0 ? 0.5 : 1 }}>
            <CheckCircle2 size={12} /> Create Request & Resolve
          </button>
        </div>
      </div>
    </div>
  );
}