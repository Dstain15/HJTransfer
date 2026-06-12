import { useState, useEffect, useRef } from 'react';
import { X, Save, AlertTriangle, Plus, Trash2, Pencil, Check, ChevronDown, Grid3x3 } from 'lucide-react';
import StatusBadge from './StatusBadge';
import SizeBreakdownModal from './SizeBreakdownModal';
import { rollupBreakdown } from './SizeBreakdownGrid';
import { toast } from 'sonner';

const BORDER = '#D8E3F8';
const TEXT   = '#1E2A4A';
const MUTED  = '#6B7BAE';
const DIM    = '#A0AECF';
const BLUE   = '#2563EB';

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

const sectionLabel = { color: MUTED, fontSize: 10, letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 };

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>{label}</label>
      {children}
    </div>
  );
}

function InlineEdit({ value, onSave, type = 'text', options = null, placeholder = '' }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || '');
  useEffect(() => { setVal(value || ''); }, [value]);

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 group w-full text-left px-2 py-1.5 rounded"
        style={{ background: '#F7F9FF', border: `1px solid ${BORDER}` }}>
        <span className="flex-1 text-xs font-mono" style={{ color: value ? TEXT : DIM, wordBreak: 'break-all' }}>
          {value || (placeholder || '—')}
        </span>
        <Pencil size={10} style={{ color: DIM }} className="group-hover:text-blue-500 transition-colors" />
      </button>
    );
  }

  return (
    <div className="flex gap-1">
      {options ? (
        <select autoFocus style={{ ...iStyle, flex: 1 }} value={val} onChange={e => setVal(e.target.value)}>
          <option value="">Select...</option>
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input autoFocus type={type} style={{ ...iStyle, flex: 1 }} value={val}
          onChange={e => setVal(e.target.value)} placeholder={placeholder}
          onKeyDown={e => { if (e.key === 'Enter') { onSave(val); setEditing(false); } if (e.key === 'Escape') setEditing(false); }} />
      )}
      <button onClick={() => { onSave(val); setEditing(false); }} className="px-2 rounded" style={{ background: BLUE, color: '#fff', border: 'none' }}>
        <Check size={12} />
      </button>
      <button onClick={() => setEditing(false)} className="px-2 rounded" style={{ background: '#EEF2FF', color: MUTED, border: `1px solid ${BORDER}` }}>
        <X size={12} />
      </button>
    </div>
  );
}

function MultiListEditor({ values = [], onChange, placeholder }) {
  const [newVal, setNewVal] = useState('');
  const add = () => { if (!newVal.trim()) return; onChange([...values, newVal.trim()]); setNewVal(''); };
  const remove = (i) => onChange(values.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-1.5">
      <div className="space-y-1">
        {values.map((v, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1 rounded" style={{ background: '#EEF2FF', border: `1px solid ${BORDER}` }}>
            <span className="flex-1 text-xs font-mono font-medium" style={{ color: BLUE }}>{v}</span>
            <button onClick={() => remove(i)} className="p-0.5 rounded hover:bg-blue-100" style={{ color: DIM }}>
              <Trash2 size={11} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        <input style={{ ...iStyle, flex: 1, fontSize: 11 }} value={newVal}
          onChange={e => setNewVal(e.target.value)} placeholder={placeholder}
          onKeyDown={e => e.key === 'Enter' && add()} />
        <button onClick={add} className="px-2 rounded" style={{ background: BLUE, color: '#fff', border: 'none' }}>
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
}

function PLSelect({ value, onChange, allRows, currentRowId }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const trucks = [...new Set(
    allRows.filter(r => r.pl_number && r.id !== currentRowId && ['In Transit','Open'].includes(r.status)).map(r => r.pl_number)
  )].sort();

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full px-2.5 py-1.5 rounded text-xs"
        style={{ ...iStyle, cursor: 'pointer' }}>
        <span style={{ color: value ? TEXT : DIM }}>{value || 'Select or enter PL#...'}</span>
        <ChevronDown size={11} style={{ color: MUTED, flexShrink: 0 }} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-full rounded py-1"
          style={{ background: '#fff', border: `1px solid ${BORDER}`, boxShadow: '0 8px 24px rgba(37,99,235,0.12)' }}>
          <div className="px-2 py-1.5 border-b" style={{ borderColor: BORDER }}>
            <div className="flex gap-1">
              <input style={{ ...iStyle, flex: 1, fontSize: 11 }} value={custom}
                onChange={e => setCustom(e.target.value)} placeholder="New PL # (e.g. ARC047)"
                onKeyDown={e => { if (e.key === 'Enter' && custom.trim()) { onChange(custom.trim()); setCustom(''); setOpen(false); } }} />
              <button onClick={() => { if (custom.trim()) { onChange(custom.trim()); setCustom(''); setOpen(false); } }}
                className="px-2 rounded" style={{ background: BLUE, color: '#fff', border: 'none' }}>
                <Plus size={11} />
              </button>
            </div>
          </div>
          {trucks.length === 0
            ? <div className="px-3 py-2 text-xs" style={{ color: DIM }}>No active trucks</div>
            : trucks.map(pl => (
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
              className="px-3 py-1.5 text-xs cursor-pointer border-t"
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

const FIELD_SECTION = {
  item_code: 'item', item_type: 'item', item_notes: 'item', order_type: 'item', customer_request_date: 'item',
  sales_orders: 'orders', wip_numbers: 'wips',
  qty_requested: 'qty',
  pl_number: 'fulfil', qty_sent: 'fulfil', date_sent: 'fulfil', arcola_notes: 'fulfil',
};

export default function EditPanel({ row, focusField, allRows = [], onClose, onSave }) {
  const [data, setData] = useState({});
  const [originalData, setOriginalData] = useState({});
  const [saving, setSaving] = useState(false);
  const [focus, setFocus] = useState(null);
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const panelRef = useRef(null);
  const refs = { item: useRef(null), orders: useRef(null), wips: useRef(null), qty: useRef(null), fulfil: useRef(null) };

  // Detect clicks outside the panel
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        const dirty = JSON.stringify(data) !== JSON.stringify(originalData);
        if (dirty) {
          setShowUnsavedWarning(true);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [data, originalData, onClose]);

  useEffect(() => {
    if (row) {
      const orders = row.sales_orders?.length > 0 ? row.sales_orders : (row.sales_order_number ? [row.sales_order_number] : []);
      const init = {
        pl_number: row.pl_number || '',
        qty_sent: row.qty_sent ?? '',
        date_sent: row.date_sent || '',
        arcola_notes: row.arcola_notes || '',
        sales_orders: orders,
        wip_numbers: row.wip_numbers || [],
        item_code: row.item_code || '',
        item_type: row.item_type || '',
        item_notes: row.item_notes || '',
        order_type: row.order_type || '',
        qty_requested: row.qty_requested ?? '',
        customer_request_date: row.customer_request_date || '',
        size_breakdown: row.size_breakdown || null,
      };
      setData(init);
      setOriginalData(init);
    }
  }, [row?.id]);

  useEffect(() => {
    if (focusField) {
      const sec = FIELD_SECTION[focusField];
      if (sec && refs[sec]?.current) {
        setTimeout(() => refs[sec].current.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      }
    }
  }, [focusField, row?.id]);

  if (!row) return null;

  const set = (k, v) => setData(d => ({ ...d, [k]: v }));
  const fs = (k) => focus === k ? { borderColor: BLUE, boxShadow: '0 0 0 2px rgba(37,99,235,0.15)' } : {};

  const isDirty = JSON.stringify(data) !== JSON.stringify(originalData);

  const handleClose = () => {
    if (isDirty) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowUnsavedWarning(false);
    onClose();
  };

  const handleSave = async () => {
    setSaving(true);
    const update = { ...data };
    update.qty_sent = update.qty_sent !== '' && update.qty_sent != null ? Number(update.qty_sent) : null;
    if (update.size_breakdown?.length > 0) {
      update.qty_requested = rollupBreakdown(update.size_breakdown, 'qty_requested');
      update.qty_sent = rollupBreakdown(update.size_breakdown, 'qty_sent') || null;
    } else {
      update.qty_requested = update.qty_requested !== '' && update.qty_requested != null ? Number(update.qty_requested) : null;
    }
    if (['Open','In Production','Ready to Ship'].includes(row.status) && update.pl_number && update.qty_sent) {
      update.status = 'In Transit';
    } else {
      update.status = row.status;
    }
    if (update.sales_orders?.length > 0) update.sales_order_number = update.sales_orders[0];
    await onSave(row.id, update);
    toast.success(`Changes saved for ${row.request_id || row.item_code}`);
    setSaving(false);
  };

  const shortfall = data.qty_sent !== '' && row.qty_received != null && Number(row.qty_received) < Number(data.qty_sent);
  const sep = { borderColor: BORDER };

  return (
    <div ref={panelRef} className="flex flex-col h-full" style={{ width: 340, background: '#fff', borderLeft: `1px solid ${BORDER}`, boxShadow: '-4px 0 20px rgba(37,99,235,0.06)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b sticky top-0 z-10" style={{ borderColor: BORDER, background: '#F0F5FF' }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: TEXT }}>Edit Transfer</span>
          {row.request_id && <span className="text-xs font-mono px-1.5 py-0.5 rounded font-semibold" style={{ background: '#DBEAFE', color: BLUE, border: '1px solid #BFDBFE', fontSize: 10 }}>{row.request_id}</span>}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={row.status || 'Open'} />
          <button onClick={handleClose} className="p-1 rounded hover:bg-blue-50 transition-colors" style={{ color: MUTED }}>
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Content - scrollable */}
      <div className="flex-1 overflow-y-auto">
      {/* ITEM DETAILS */}
      <div ref={refs.item} className="px-4 py-3 border-b space-y-2.5" style={sep}>
        <p style={sectionLabel}>Item Details</p>
        <Field label="Item Code">
          <InlineEdit value={data.item_code} placeholder="Item code" onSave={v => set('item_code', v)} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Item Type">
            <InlineEdit value={data.item_type} options={['GOWN','TASSEL','STOLE','CAP','TAM','SIGNET','CORD','ZIPPER','MISC','OTHER']} onSave={v => set('item_type', v)} />
          </Field>
          <Field label="Order Type">
            <InlineEdit value={data.order_type} options={['HOMESHIP','ALPHA','BULK','STOCK','RUSH','OTHER']} onSave={v => set('order_type', v)} />
          </Field>
        </div>
        <Field label="Item Notes">
          <textarea style={{ ...iStyle, resize: 'none', height: 50, fontSize: 11, ...fs('in') }}
            value={data.item_notes} onChange={e => set('item_notes', e.target.value)}
            onFocus={() => setFocus('in')} onBlur={() => setFocus(null)}
            placeholder="Batch numbers, instructions..." />
        </Field>
        <Field label="Customer Request Date">
          <input type="date" style={{ ...iStyle, ...fs('crd') }} value={data.customer_request_date}
            onChange={e => set('customer_request_date', e.target.value)}
            onFocus={() => setFocus('crd')} onBlur={() => setFocus(null)} />
        </Field>
      </div>

      {/* SALES ORDERS */}
      <div ref={refs.orders} className="px-4 py-3 border-b" style={sep}>
        <p style={sectionLabel}>Sales Orders</p>
        <MultiListEditor values={data.sales_orders || []} onChange={v => set('sales_orders', v)} placeholder="Add sales order #..." />
      </div>

      {/* WIP NUMBERS */}
      <div ref={refs.wips} className="px-4 py-3 border-b" style={sep}>
        <p style={sectionLabel}>WIP #s</p>
        <MultiListEditor values={data.wip_numbers || []} onChange={v => set('wip_numbers', v)} placeholder="Add WIP #..." />
      </div>

      {/* QTY REQUESTED / SIZE BREAKDOWN */}
      <div ref={refs.qty} className="px-4 py-3 border-b" style={sep}>
        {data.size_breakdown?.length > 0 ? (
          <>
            <p style={sectionLabel}>Size Breakdown (GOWN STOCK)</p>
            {/* Summary row */}
            <div className="flex items-center justify-between mb-2 px-3 py-2 rounded" style={{ background: '#F7F9FF', border: `1px solid ${BORDER}` }}>
              <div className="flex gap-4">
                <span className="text-xs" style={{ color: MUTED }}>
                  Req: <strong style={{ color: '#1E2A4A' }}>{rollupBreakdown(data.size_breakdown, 'qty_requested') || 0}</strong>
                </span>
                <span className="text-xs" style={{ color: MUTED }}>
                  Sent: <strong style={{ color: '#B45309' }}>{rollupBreakdown(data.size_breakdown, 'qty_sent') || 0}</strong>
                </span>
              </div>
              <button
                onClick={() => setShowSizeModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: '#2563EB', color: '#fff' }}>
                <Grid3x3 size={12} /> Enter Quantities
              </button>
            </div>
          </>
        ) : (
          <Field label="Qty Requested">
            <input type="number" style={{ ...iStyle, ...fs('qreq') }}
              value={data.qty_requested} onChange={e => set('qty_requested', e.target.value)}
              onFocus={() => setFocus('qreq')} onBlur={() => setFocus(null)} min={0} placeholder="0" />
          </Field>
        )}
      </div>

      {/* FULFILMENT */}
      <div ref={refs.fulfil} className="px-4 py-3 border-b space-y-3" style={sep}>
        <p style={sectionLabel}>Fulfilment</p>
        <Field label="PL # / Truck Number">
          <PLSelect value={data.pl_number} onChange={v => set('pl_number', v)} allRows={allRows} currentRowId={row.id} />
        </Field>
        {/* Hide standalone Qty Sent for GOWN STOCK — it's managed in size breakdown modal */}
        {!data.size_breakdown?.length && (
          <Field label={`Qty Sent${data.pl_number ? ' *' : ''}`}>
            <input type="number"
              style={{ ...iStyle, borderColor: data.pl_number && !data.qty_sent ? '#F59E0B' : focus === 'qs' ? BLUE : BORDER }}
              value={data.qty_sent} onChange={e => set('qty_sent', e.target.value)}
              onFocus={() => setFocus('qs')} onBlur={() => setFocus(null)} min={0} placeholder="0" />
            {data.pl_number && !data.qty_sent && <p className="text-xs mt-1" style={{ color: '#D97706' }}>Required when assigning a truck</p>}
          </Field>
        )}
        <Field label="Date Sent">
          <input type="date" style={{ ...iStyle, ...fs('ds') }} value={data.date_sent}
            onChange={e => set('date_sent', e.target.value)}
            onFocus={() => setFocus('ds')} onBlur={() => setFocus(null)} />
        </Field>
        <Field label="Arcola Notes">
          <textarea style={{ ...iStyle, ...fs('an'), resize: 'none', height: 55 }}
            value={data.arcola_notes} onChange={e => set('arcola_notes', e.target.value)}
            onFocus={() => setFocus('an')} onBlur={() => setFocus(null)}
            placeholder="Notes, batch info..." />
        </Field>
        <div className="px-3 py-2 rounded text-xs" style={{ background: '#F0F5FF', border: `1px solid ${BORDER}`, color: MUTED }}>
          Status auto-updates:
          <div className="mt-1 space-y-0.5">
            <div>• Assign truck + qty → <span style={{ color: '#D97706', fontWeight: 600 }}>In Transit</span></div>
            <div>• Receive via truck screen → <span style={{ color: '#16A34A', fontWeight: 600 }}>Received</span> / <span style={{ color: '#DC2626', fontWeight: 600 }}>Not Fully Received</span></div>
          </div>
        </div>
        {row.qty_received != null && (
          <div className="px-3 py-2 rounded" style={{ background: shortfall ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${shortfall ? '#FECACA' : '#BBF7D0'}` }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium" style={{ color: MUTED }}>Qty Received</span>
              <span className="text-xs font-mono font-bold" style={{ color: shortfall ? '#DC2626' : '#16A34A' }}>{row.qty_received}</span>
            </div>
            {shortfall && (
              <div className="flex items-center gap-1 mt-1">
                <AlertTriangle size={10} style={{ color: '#DC2626' }} />
                <span className="text-xs font-medium" style={{ color: '#DC2626' }}>Shortfall of {Number(data.qty_sent) - Number(row.qty_received)}</span>
              </div>
            )}
          </div>
        )}
      </div>
      </div>

      {/* Size Breakdown Modal */}
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

      {/* Save */}
      <div className="px-4 py-3 flex-shrink-0" style={{ background: '#F0F5FF', borderTop: `1px solid ${BORDER}` }}>
        <button onClick={handleSave} disabled={saving || !!(data.pl_number && !data.size_breakdown?.length && !data.qty_sent)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold shadow-sm"
          style={{ background: BLUE, color: '#fff', opacity: (saving || (data.pl_number && !data.size_breakdown?.length && !data.qty_sent)) ? 0.5 : 1 }}>
          {saving
            ? <><div className="w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: '#fff' }} />Saving...</>
            : <><Save size={13} />Save Changes</>}
        </button>
      </div>
    </div>
  );
}