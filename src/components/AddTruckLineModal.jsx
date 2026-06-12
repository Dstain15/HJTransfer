import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Search, Plus, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const BORDER = '#D8E3F8';
const TEXT = '#1E2A4A';
const MUTED = '#6B7BAE';
const BLUE = '#2563EB';

const inputStyle = {
  background: '#fff', border: `1px solid ${BORDER}`, color: TEXT,
  borderRadius: 6, padding: '6px 10px', fontSize: 12, outline: 'none', width: '100%',
};

const ITEM_TYPES = ['GOWN','TASSEL','STOLE','CAP','TAM','SIGNET','CORD','ZIPPER','MISC','OTHER'];
const DONE_STATUSES = ['Received', 'Cancelled', 'Received Partial'];

export default function AddTruckLineModal({ plNumber, allRows, onClose, onAdded }) {
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState('existing'); // 'existing' | 'new'
  const [saving, setSaving] = useState(false);
  const [newLine, setNewLine] = useState({ item_type: '', item_code: '', qty: '' });

  const openRequests = useMemo(() =>
    allRows.filter(r => !DONE_STATUSES.includes(r.status) && r.pl_number !== plNumber),
  [allRows, plNumber]);

  const filtered = useMemo(() => {
    if (!search) return openRequests;
    const s = search.toLowerCase();
    return openRequests.filter(r => {
      const sos = (r.sales_orders || [r.sales_order_number]).filter(Boolean).join(' ');
      return [r.item_code, r.request_id, sos, (r.wip_numbers || []).join(' ')].join(' ').toLowerCase().includes(s);
    });
  }, [openRequests, search]);

  const addExisting = async (row) => {
    setSaving(true);
    await base44.entities.TransferRequest.update(row.id, {
      pl_number: plNumber,
      status: 'In Transit',
      date_sent: new Date().toISOString().split('T')[0],
      qty_sent: row.qty_sent ?? row.qty_requested,
    });
    toast.success(`${row.item_code} added to PL# ${plNumber}`);
    setSaving(false);
    onAdded();
  };

  const addNew = async () => {
    setSaving(true);
    const qty = Number(newLine.qty);
    await base44.entities.TransferRequest.create({
      request_id: `TR-ADD-${Date.now().toString().slice(-6)}`,
      date_logged: new Date().toISOString().split('T')[0],
      item_type: newLine.item_type,
      item_code: newLine.item_code.trim(),
      qty_requested: qty,
      qty_sent: qty,
      pl_number: plNumber,
      status: 'In Transit',
      date_sent: new Date().toISOString().split('T')[0],
      item_notes: 'Added during truck receiving',
    });
    toast.success(`${newLine.item_code} added to PL# ${plNumber}`);
    setSaving(false);
    onAdded();
  };

  const canAddNew = newLine.item_type && newLine.item_code.trim() && Number(newLine.qty) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(30,42,74,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-xl shadow-2xl flex flex-col" style={{ background: '#fff', border: `1px solid ${BORDER}`, width: 520, maxHeight: '80vh' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: BORDER }}>
          <span className="text-sm font-semibold" style={{ color: TEXT }}>Add Line to PL# {plNumber}</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-blue-50" style={{ color: MUTED }}><X size={14} /></button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 px-4 pt-3 flex-shrink-0">
          {[{ key: 'existing', label: 'From Open Requests' }, { key: 'new', label: 'New Item' }].map(({ key, label }) => (
            <button key={key} onClick={() => setMode(key)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{
                background: mode === key ? BLUE : '#EEF2FF',
                color: mode === key ? '#fff' : MUTED,
                border: `1px solid ${mode === key ? '#1D4ED8' : BORDER}`,
              }}>
              {label}
            </button>
          ))}
        </div>

        {mode === 'existing' ? (
          <>
            <div className="px-4 py-3 flex-shrink-0">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
                <input style={{ ...inputStyle, paddingLeft: 28 }} autoFocus
                  placeholder="Search item code, request ID, sales order..."
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4" style={{ minHeight: 120 }}>
              {filtered.length === 0 ? (
                <p className="text-xs text-center py-6" style={{ color: MUTED }}>
                  No matching open requests. Use the "New Item" tab to type it in.
                </p>
              ) : filtered.slice(0, 50).map(row => (
                <div key={row.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg mb-1"
                  style={{ border: `1px solid ${BORDER}`, background: '#F7F9FF' }}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold" style={{ color: TEXT, fontSize: 11 }}>{row.item_code}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: '#DBEAFE', color: '#1D4ED8', border: '1px solid #BFDBFE', fontSize: 9 }}>{row.item_type}</span>
                    </div>
                    <div className="text-xs" style={{ color: MUTED, fontSize: 10 }}>
                      {row.request_id} · {row.status} · Qty {row.qty_requested ?? '—'}
                    </div>
                  </div>
                  <button onClick={() => addExisting(row)} disabled={saving}
                    className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold flex-shrink-0"
                    style={{ background: BLUE, color: '#fff', opacity: saving ? 0.5 : 1 }}>
                    <Plus size={11} /> Add
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="px-4 py-4 space-y-3">
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: MUTED }}>Item Type</label>
              <select style={inputStyle} value={newLine.item_type}
                onChange={e => setNewLine(n => ({ ...n, item_type: e.target.value }))}>
                <option value="">Select...</option>
                {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: MUTED }}>Item Code</label>
              <input style={inputStyle} value={newLine.item_code}
                onChange={e => setNewLine(n => ({ ...n, item_code: e.target.value }))}
                placeholder="Item code..." />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: MUTED }}>Qty on Truck</label>
              <input type="text" inputMode="numeric" pattern="[0-9]*" style={{ ...inputStyle, width: 120 }}
                value={newLine.qty}
                onChange={e => setNewLine(n => ({ ...n, qty: e.target.value.replace(/\D/g, '').slice(0, 5) }))}
                placeholder="0" />
            </div>
            <div className="flex justify-end pt-1">
              <button onClick={addNew} disabled={!canAddNew || saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold"
                style={{ background: BLUE, color: '#fff', opacity: !canAddNew || saving ? 0.5 : 1 }}>
                <CheckCircle2 size={12} /> Add to Truck
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}