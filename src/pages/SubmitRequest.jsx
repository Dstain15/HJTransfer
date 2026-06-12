import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { PlusCircle, CheckCircle, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import SizeBreakdownGrid, { initBreakdown, rollupBreakdown } from '@/components/SizeBreakdownGrid';

const inputClass = "w-full rounded px-3 py-2 text-xs transition-all focus:outline-none";
const inputStyle = { background: '#fff', border: '1px solid #D8E3F8', color: '#1E2A4A' };
const focusStyle = { borderColor: '#2563EB', boxShadow: '0 0 0 2px rgba(37,99,235,0.12)' };

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: '#7A7A7A' }}>
        {label}{required && <span style={{ color: '#EF4444' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function generateRequestId() {
  const ts = Date.now().toString(36).toUpperCase();
  return `TR-${ts}`;
}

const EMPTY = {
  sales_orders: [''],
  date_logged: new Date().toISOString().split('T')[0],
  customer_request_date: '',
  order_type: '',
  item_type: '',
  item_code: '',
  item_notes: '',
  qty_requested: '',
  size_breakdown: null,
};

export default function SubmitRequest() {
  const [form, setForm] = useState(EMPTY);
  const [focus, setFocus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (k, v) => setForm(f => {
    const updated = { ...f, [k]: v };
    // Auto-init/clear size breakdown when switching to/from GOWN+STOCK
    const isGownStock = (k === 'item_type' ? v : updated.item_type) === 'GOWN' &&
                        (k === 'order_type' ? v : updated.order_type) === 'STOCK';
    if (isGownStock && !updated.size_breakdown) {
      updated.size_breakdown = initBreakdown();
      updated.qty_requested = '';
    } else if (!isGownStock) {
      updated.size_breakdown = null;
    }
    return updated;
  });

  const setSO = (i, v) => {
    const arr = [...form.sales_orders];
    arr[i] = v;
    set('sales_orders', arr);
  };
  const addSO = () => set('sales_orders', [...form.sales_orders, '']);
  const removeSO = (i) => set('sales_orders', form.sales_orders.filter((_, idx) => idx !== i));

  const isGownStock = form.item_type === 'GOWN' && form.order_type === 'STOCK';



  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSaving(true);
    const sos = (form.sales_orders || []).filter(Boolean);
    const effectiveQty = form.size_breakdown
      ? rollupBreakdown(form.size_breakdown, 'qty_requested')
      : Number(form.qty_requested);
    
    await base44.entities.TransferRequest.create({
      status: 'Open',
      discrepancy_flag: false,
      date_logged: form.date_logged,
      request_id: generateRequestId(),
      sales_orders: sos,
      sales_order_number: sos[0] || '',
      order_type: form.order_type,
      customer_request_date: form.customer_request_date,
      item_type: form.item_type,
      item_code: form.item_code,
      item_notes: form.item_notes,
      qty_requested: effectiveQty,
      size_breakdown: form.size_breakdown || null,
    });

    setSaving(false);
    setSuccess(true);
    toast.success('Request submitted successfully');
    setForm(EMPTY);
    setTimeout(() => setSuccess(false), 3000);
  };

  const currentValid = form.item_code && form.item_type && form.order_type && form.customer_request_date &&
    (isGownStock ? rollupBreakdown(form.size_breakdown, 'qty_requested') > 0 : form.qty_requested);
  const canSubmit = currentValid;

  return (
    <div className="h-full overflow-auto" style={{ background: '#F0F5FF' }}>
      <div className="max-w-2xl mx-auto px-6 py-5 space-y-5">
        {success && (
          <div className="flex items-center gap-2 px-4 py-3 rounded text-xs font-medium" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D' }}>
            <CheckCircle size={14} /> Request(s) submitted successfully
          </div>
        )}

        {/* Order Info */}
        <div className="rounded-lg p-5" style={{ background: '#fff', border: '1px solid #D8E3F8' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#6B7BAE' }}>Order Info</p>
          <div className="grid grid-cols-2 gap-4">
            {/* Sales Orders */}
            <div className="col-span-2">
              <Field label="Sales Order #(s)">
                <div className="space-y-2">
                  {form.sales_orders.map((so, i) => (
                    <div key={i} className="flex gap-1">
                      <input
                        className={inputClass}
                        style={{ ...inputStyle, ...(focus === `so${i}` ? focusStyle : {}), flex: 1 }}
                        value={so}
                        onChange={e => setSO(i, e.target.value)}
                        onFocus={() => setFocus(`so${i}`)} onBlur={() => setFocus(null)}
                        placeholder={`Sales order #${i + 1}`}
                      />
                      {form.sales_orders.length > 1 && (
                        <button onClick={() => removeSO(i)} className="px-2 rounded" style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' }}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addSO}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded"
                    style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}
                  >
                    <Plus size={11} /> Add another sales order
                  </button>
                </div>
              </Field>
            </div>

            <Field label="Order Type" required>
              <select className={inputClass} style={{ ...inputStyle, ...(focus === 'ot' ? focusStyle : {}) }}
                value={form.order_type} onChange={e => set('order_type', e.target.value)}
                onFocus={() => setFocus('ot')} onBlur={() => setFocus(null)}>
                <option value="">Select type...</option>
                {['HOMESHIP','ALPHA','BULK','STOCK','RUSH','OTHER'].map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Date Logged">
              <input type="date" className={inputClass} style={{ ...inputStyle, background: '#F1F5F9', color: '#94A3B8', cursor: 'not-allowed' }}
                value={form.date_logged} disabled />
            </Field>
            <Field label="Customer Request Date" required>
              <input type="date" className={inputClass} style={{ ...inputStyle, ...(focus === 'crd' ? focusStyle : {}) }}
                value={form.customer_request_date} onChange={e => set('customer_request_date', e.target.value)}
                onFocus={() => setFocus('crd')} onBlur={() => setFocus(null)} />
            </Field>
          </div>
        </div>

        {/* Item Details */}
        <div className="rounded-lg p-5" style={{ background: '#fff', border: '1px solid #D8E3F8' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#6B7BAE' }}>Item Details</p>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Item Type" required>
              <select className={inputClass} style={{ ...inputStyle, ...(focus === 'it' ? focusStyle : {}) }}
                value={form.item_type} onChange={e => set('item_type', e.target.value)}
                onFocus={() => setFocus('it')} onBlur={() => setFocus(null)}>
                <option value="">Select...</option>
                {['GOWN','TASSEL','STOLE','CAP','TAM','SIGNET','CORD','ZIPPER','MISC','OTHER'].map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Item Code" required>
              <input className={inputClass} style={{ ...inputStyle, ...(focus === 'ic' ? focusStyle : {}) }}
                value={form.item_code} onChange={e => set('item_code', e.target.value)}
                onFocus={() => setFocus('ic')} onBlur={() => setFocus(null)}
                placeholder="e.g. RG.D1025BLACK..." />
            </Field>
            {!isGownStock && (
              <Field label="Qty Requested" required>
                <input type="text" inputMode="numeric" pattern="[0-9]*" className={inputClass} style={{ ...inputStyle, ...(focus === 'qr' ? focusStyle : {}), WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                  value={form.qty_requested} onChange={e => {
                    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 5);
                    set('qty_requested', cleaned);
                  }}
                  onFocus={() => setFocus('qr')} onBlur={() => setFocus(null)}
                  placeholder="0" />
              </Field>
            )}
            <div className="col-span-3">
              <Field label="Item Notes">
                <textarea className={inputClass} style={{ ...inputStyle, ...(focus === 'in' ? focusStyle : {}), resize: 'none', height: 60 }}
                  value={form.item_notes} onChange={e => set('item_notes', e.target.value)}
                  onFocus={() => setFocus('in')} onBlur={() => setFocus(null)}
                  placeholder="Batch numbers, due dates, special instructions..." />
              </Field>
            </div>
            {isGownStock && (
              <div className="col-span-3">
                <Field label="Units by Size (R / X / Z)">
                  <SizeBreakdownGrid
                    breakdown={form.size_breakdown || initBreakdown()}
                    onChange={v => set('size_breakdown', v)}
                  />
                  <p className="text-xs mt-1" style={{ color: '#6B7BAE' }}>
                    Total: <strong>{rollupBreakdown(form.size_breakdown, 'qty_requested') || 0}</strong> units
                  </p>
                </Field>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={handleSubmit} disabled={saving || !canSubmit}
            className="flex items-center gap-2 px-5 py-2 rounded text-sm font-semibold transition-all"
            style={{ background: '#2563EB', color: '#ffffff', border: '1px solid #1D4ED8', opacity: (!canSubmit) ? 0.4 : 1, cursor: (!canSubmit) ? 'not-allowed' : 'pointer' }}>
            {saving
              ? <><div className="w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: '#3A5A9A', borderTopColor: '#ffffff' }} />Submitting...</>
              : <><PlusCircle size={14} />Submit Request</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}