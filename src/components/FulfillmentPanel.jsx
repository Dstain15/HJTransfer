import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Save, Plus, ChevronDown, Grid3x3 } from 'lucide-react';
import SizeBreakdownModal from './SizeBreakdownModal';
import { rollupBreakdown } from './SizeBreakdownGrid';
import { toast } from 'sonner';

const BORDER = '#D8E3F8';
const TEXT = '#1E2A4A';
const MUTED = '#6B7BAE';
const DIM = '#A0AECF';
const BLUE = '#2563EB';

const iStyle = {
  background: '#F7F9FF',
  border: `1px solid ${BORDER}`,
  color: TEXT,
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 12,
  outline: 'none',
  width: '100%',
};

function PLSelect({ value, onChange, allRows, currentRowId }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Get all existing PL numbers from history (including Received ones)
  const allPLs = [...new Set(allRows.filter(r => r.pl_number).map(r => r.pl_number))].sort();
  
  // Calculate next ARC### number
  const nextPLNumber = useMemo(() => {
    const arcNumbers = allPLs
      .filter(pl => /^ARC\d{3}$/i.test(pl))
      .map(pl => parseInt(pl.replace(/^ARC/i, ''), 10));
    const maxNum = arcNumbers.length > 0 ? Math.max(...arcNumbers) : 0;
    return `ARC${String(maxNum + 1).padStart(3, '0')}`;
  }, [allPLs]);

  // Active trucks for dropdown (In Transit or Open status, excluding current row)
  const activeTrucks = [...new Set(
    allRows.filter(r => r.pl_number && r.id !== currentRowId && ['In Transit', 'Open'].includes(r.status)).map(r => r.pl_number)
  )].sort();

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full px-2.5 py-1.5 rounded text-xs"
        style={{ ...iStyle, cursor: 'pointer' }}>
        <span style={{ color: value ? TEXT : DIM }}>{value || `Select PL# (next: ${nextPLNumber})`}</span>
        <ChevronDown size={11} style={{ color: MUTED, flexShrink: 0 }} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-full rounded py-1"
          style={{ background: '#fff', border: `1px solid ${BORDER}`, boxShadow: '0 8px 24px rgba(37,99,235,0.12)' }}>
          {/* Next PL Number suggestion */}
          <div onClick={() => { onChange(nextPLNumber); setOpen(false); }}
            className="px-3 py-2 text-xs cursor-pointer font-mono font-semibold border-b"
            style={{ color: BLUE, background: '#EEF2FF', borderColor: BORDER }}
            onMouseEnter={e => e.currentTarget.style.background = '#DBEAFE'}
            onMouseLeave={e => e.currentTarget.style.background = '#EEF2FF'}>
            + {nextPLNumber} (New Truck)
          </div>
          {/* Existing active trucks */}
          {activeTrucks.length === 0
            ? <div className="px-3 py-2 text-xs" style={{ color: DIM }}>No other active trucks</div>
            : activeTrucks.map(pl => (
              <div key={pl} onClick={() => { onChange(pl); setOpen(false); }}
                className="px-3 py-1.5 text-xs cursor-pointer font-mono font-semibold"
                style={{ color: value === pl ? BLUE : TEXT, background: value === pl ? '#EEF2FF' : 'transparent' }}
                onMouseEnter={e => { if (value !== pl) e.currentTarget.style.background = '#F7F9FF'; }}
                onMouseLeave={e => { if (value !== pl) e.currentTarget.style.background = 'transparent'; }}>
                {pl}
              </div>
            ))
          }
          {value && (
            <div onClick={() => { onChange(''); setOpen(false); }}
              className="px-3 py-1.5 text-xs cursor-pointer border-t mt-1"
              style={{ color: MUTED, borderColor: BORDER }}
              onMouseEnter={e => e.currentTarget.style.background = '#F7F9FF'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              Clear
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FulfillmentPanel({ row, allRows = [], onClose, onSave, onTryClose }) {
  const isGownStock = row.size_breakdown?.length > 0;

  const [data, setData] = useState({
    pl_number: row.pl_number || '',
    qty_sent: row.qty_sent ?? '',
    date_sent: row.date_sent || '',
    arcola_notes: row.arcola_notes || '',
    size_breakdown: row.size_breakdown || null,
  });
  const [saving, setSaving] = useState(false);
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [focus, setFocus] = useState(null);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  const set = (k, v) => setData(d => ({ ...d, [k]: v }));

  const originalData = {
    pl_number: row.pl_number || '',
    qty_sent: row.qty_sent ?? '',
    date_sent: row.date_sent || '',
    arcola_notes: row.arcola_notes || '',
    size_breakdown: row.size_breakdown || null,
  };

  const isDirty = JSON.stringify(data) !== JSON.stringify(originalData);

  const handleClose = () => {
    if (isDirty) {
      setShowUnsavedWarning(true);
    } else {
      if (onTryClose) {
        onTryClose();
      } else {
        onClose();
      }
    }
  };

  const handleConfirmClose = () => {
    setShowUnsavedWarning(false);
    if (onTryClose) {
      onTryClose();
    } else {
      onClose();
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Auto-populate date_sent to today when PL# is selected
  useEffect(() => {
    if (data.pl_number && !data.date_sent) {
      set('date_sent', new Date().toISOString().split('T')[0]);
    }
  }, [data.pl_number]);

  const handleSave = async () => {
    setSaving(true);
    const update = { ...data };
    if (isGownStock) {
      update.qty_sent = rollupBreakdown(update.size_breakdown, 'qty_sent') || null;
    } else {
      update.qty_sent = update.qty_sent !== '' && update.qty_sent != null ? Number(update.qty_sent) : null;
    }
    if (['Open', 'In Production', 'Ready to Ship'].includes(row.status) && update.pl_number && update.qty_sent) {
      update.status = 'In Transit';
    } else {
      update.status = row.status;
    }
    await onSave(row.id, update);
    toast.success(`Fulfilment saved for ${row.request_id || row.item_code}`);
    setSaving(false);
    handleClose();
  };

  const fs = (k) => focus === k ? { borderColor: BLUE, boxShadow: '0 0 0 2px rgba(37,99,235,0.15)' } : {};
  const shortfall = !isGownStock && data.qty_sent !== '' && row.qty_received != null && Number(row.qty_received) < Number(data.qty_sent);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(30,42,74,0.35)' }}
      onClick={handleBackdropClick}>
      <div className="flex flex-col rounded-xl shadow-2xl" style={{ background: '#fff', border: `1px solid ${BORDER}`, width: 360, maxHeight: '85vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: BORDER, background: '#F0F5FF', borderRadius: '12px 12px 0 0' }}>
          <div>
            <span className="text-sm font-semibold" style={{ color: TEXT }}>Fulfilment</span>
            {row.request_id && (
              <span className="ml-2 text-xs font-mono px-1.5 py-0.5 rounded font-semibold"
                style={{ background: '#DBEAFE', color: BLUE, border: '1px solid #BFDBFE', fontSize: 10 }}>{row.request_id}</span>
            )}
          </div>
          <button onClick={handleClose} className="p-1.5 rounded hover:bg-blue-100" style={{ color: MUTED }}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {/* Item summary */}
          <div className="px-3 py-2 rounded text-xs" style={{ background: '#F7F9FF', border: `1px solid ${BORDER}` }}>
            <span className="font-mono font-semibold" style={{ color: TEXT }}>{row.item_code}</span>
            <span className="ml-2 px-1.5 py-0.5 rounded" style={{ background: '#DBEAFE', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>{row.item_type}</span>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>PL # / Truck Number</label>
            <PLSelect value={data.pl_number} onChange={v => set('pl_number', v)} allRows={allRows} currentRowId={row.id} />
          </div>

          {/* Qty Sent — hidden for GOWN STOCK (handled in size modal) */}
          {!isGownStock && (
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>
                Qty Sent{data.pl_number ? ' *' : ''}
              </label>
              <div className="flex gap-2 items-center">
                <input type="number"
                  style={{ ...iStyle, flex: 1, borderColor: data.pl_number && !data.qty_sent ? '#F59E0B' : focus === 'qs' ? BLUE : BORDER }}
                  value={data.qty_sent} onChange={e => set('qty_sent', e.target.value)}
                  onFocus={() => setFocus('qs')} onBlur={() => setFocus(null)} min={0} placeholder="0" />
                <div className="flex-shrink-0 px-3 py-1.5 rounded text-xs font-medium" style={{ background: '#F0F5FF', border: `1px solid ${BORDER}`, color: MUTED, whiteSpace: 'nowrap' }}>
                  Req: <strong style={{ color: TEXT }}>{row.qty_requested ?? '—'}</strong>
                </div>
              </div>
              {data.pl_number && !data.qty_sent && (
                <p className="text-xs mt-1" style={{ color: '#D97706' }}>Required when assigning a truck</p>
              )}
            </div>
          )}

          {/* GOWN STOCK size sent summary + button */}
          {isGownStock && (
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Qty Sent (by Size)</label>
              <div className="flex items-center justify-between px-3 py-2 rounded" style={{ background: '#F7F9FF', border: `1px solid ${BORDER}` }}>
                <div className="flex gap-4">
                  <span className="text-xs" style={{ color: MUTED }}>
                    Req: <strong style={{ color: TEXT }}>{rollupBreakdown(data.size_breakdown, 'qty_requested') || 0}</strong>
                  </span>
                  <span className="text-xs" style={{ color: MUTED }}>
                    Sent: <strong style={{ color: '#B45309' }}>{rollupBreakdown(data.size_breakdown, 'qty_sent') || 0}</strong>
                  </span>
                </div>
                <button onClick={() => setShowSizeModal(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: BLUE, color: '#fff' }}>
                  <Grid3x3 size={11} /> Enter Quantities
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Date Sent</label>
            <input type="date" style={{ ...iStyle, ...fs('ds') }} value={data.date_sent}
              onChange={e => set('date_sent', e.target.value)}
              onFocus={() => setFocus('ds')} onBlur={() => setFocus(null)} />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Arcola Notes</label>
            <textarea style={{ ...iStyle, ...fs('an'), resize: 'none', height: 60 }}
              value={data.arcola_notes} onChange={e => set('arcola_notes', e.target.value)}
              onFocus={() => setFocus('an')} onBlur={() => setFocus(null)}
              placeholder="Notes, batch info..." />
          </div>

          {row.qty_received != null && (
            <div className="px-3 py-2 rounded" style={{ background: shortfall ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${shortfall ? '#FECACA' : '#BBF7D0'}` }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium" style={{ color: MUTED }}>Qty Received</span>
                <span className="text-xs font-mono font-bold" style={{ color: shortfall ? '#DC2626' : '#16A34A' }}>{row.qty_received}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t flex-shrink-0" style={{ borderColor: BORDER, background: '#F0F5FF', borderRadius: '0 0 12px 12px' }}>
          <button onClick={handleSave} disabled={saving || !!(data.pl_number && !isGownStock && !data.qty_sent)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold"
            style={{ background: BLUE, color: '#fff', opacity: (saving || (data.pl_number && !isGownStock && !data.qty_sent)) ? 0.5 : 1 }}>
            {saving
              ? <><div className="w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: '#fff' }} />Saving...</>
              : <><Save size={13} />Save Fulfilment</>}
          </button>
        </div>
      </div>

      {showSizeModal && data.size_breakdown && (
        <SizeBreakdownModal
          breakdown={data.size_breakdown}
          onChange={v => set('size_breakdown', v)}
          onClose={() => setShowSizeModal(false)}
        />
      )}

      {/* Unsaved changes warning */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(30,42,74,0.4)' }}>
          <div className="rounded-xl shadow-2xl p-5 w-72" style={{ background: '#fff', border: `1px solid ${BORDER}` }}>
            <p className="text-sm font-semibold mb-1" style={{ color: TEXT }}>Unsaved Changes</p>
            <p className="text-xs mb-4" style={{ color: MUTED }}>You have unsaved changes. Are you sure you want to close without saving?</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowUnsavedWarning(false)}
                className="px-3 py-1.5 rounded text-xs font-medium"
                style={{ background: '#EEF2FF', color: MUTED, border: `1px solid ${BORDER}` }}>
                Keep Editing
              </button>
              <button onClick={handleConfirmClose}
                className="px-3 py-1.5 rounded text-xs font-semibold"
                style={{ background: '#DC2626', color: '#fff' }}>
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}