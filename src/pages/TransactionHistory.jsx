import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { History, Search, ChevronDown, ChevronRight, RefreshCw, PackageCheck, PlusCircle, Truck, AlertTriangle, Edit2, CheckCircle, Download } from 'lucide-react';
import { format } from 'date-fns';
import { exportToCSV } from '@/utils/exportToCSV';

const BORDER = '#D8E3F8';
const TEXT   = '#1E2A4A';
const MUTED  = '#6B7BAE';
const DIM    = '#A0AECF';
const BLUE   = '#2563EB';

// Determine the primary "action" for a record based on its current state
function inferAction(req) {
  const isNew = req.created_date && req.updated_date &&
    Math.abs(new Date(req.created_date) - new Date(req.updated_date)) < 5000;

  if (isNew) return { label: 'Request Created', icon: PlusCircle, color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' };

  if (req.status === 'Received') return { label: 'Truck Received — All Matched', icon: CheckCircle, color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' };
  if (req.status === 'Not Fully Received') return { label: 'Truck Received — Shortfall Flagged', icon: AlertTriangle, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' };
  if (req.status === 'In Transit' && req.pl_number && req.qty_sent) return { label: 'Dispatched on Truck', icon: Truck, color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' };
  if (req.status === 'Cancelled') return { label: 'Request Cancelled', icon: AlertTriangle, color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' };
  if (req.status === 'Ready to Ship') return { label: 'Marked Ready to Ship', icon: PackageCheck, color: '#0369A1', bg: '#F0F9FF', border: '#BAE6FD' };
  if (req.status === 'In Production') return { label: 'Moved to In Production', icon: Edit2, color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' };
  if (req.qty_received != null) return { label: 'Qty Received Updated', icon: PackageCheck, color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' };
  if (req.pl_number) return { label: 'PL # / Truck Assigned', icon: Truck, color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' };
  if (req.arcola_notes) return { label: 'Notes Updated', icon: Edit2, color: MUTED, bg: '#EEF2FF', border: BORDER };

  return { label: 'Record Updated', icon: Edit2, color: MUTED, bg: '#EEF2FF', border: BORDER };
}

// Build a list of "what changed" bullets from the record state
function getChangeSummary(req) {
  const items = [];
  if (req.status) items.push({ label: 'Status', value: req.status, highlight: true });
  if (req.pl_number) items.push({ label: 'PL #', value: req.pl_number, mono: true });
  if (req.qty_sent != null) items.push({ label: 'Qty Sent', value: req.qty_sent });
  if (req.qty_received != null) items.push({ label: 'Qty Received', value: req.qty_received, color: req.discrepancy_flag ? '#DC2626' : '#16A34A' });
  if (req.date_sent) items.push({ label: 'Date Sent', value: req.date_sent });
  if (req.arcola_notes) items.push({ label: 'Arcola Notes', value: req.arcola_notes });
  if (req.discrepancy_flag) items.push({ label: 'Discrepancy', value: req.discrepancy_notes || 'Flagged', color: '#DC2626' });
  return items;
}

const STATUS_STYLES = {
  'Open':               { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  'In Production':      { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  'Ready to Ship':      { bg: '#F0F9FF', color: '#0369A1', border: '#BAE6FD' },
  'In Transit':         { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
  'Received':           { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  'Not Fully Received': { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  'Cancelled':          { bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB' },
};

function StatusPill({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES['Open'];
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>
      {status}
    </span>
  );
}

function RequestRow({ req }) {
  const [expanded, setExpanded] = useState(false);
  const fmt = (d) => { if (!d) return '—'; try { return format(new Date(d), 'M/d/yy h:mm a'); } catch { return d; } };
  const fmtDate = (d) => { if (!d) return '—'; try { return format(new Date(d), 'M/d/yy'); } catch { return d; } };

  const action = inferAction(req);
  const ActionIcon = action.icon;
  const changeSummary = getChangeSummary(req);

  const allFields = [
    { label: 'Item Code',     value: req.item_code, mono: true },
    { label: 'Item Type',     value: req.item_type },
    { label: 'Order Type',    value: req.order_type || '—' },
    { label: 'Sales Orders',  value: (req.sales_orders || []).join(', ') || '—' },
    { label: 'WIP #s',        value: (req.wip_numbers || []).join(', ') || '—' },
    { label: 'PL #',          value: req.pl_number || '—', mono: true },
    { label: 'Qty Requested', value: req.qty_requested ?? '—' },
    { label: 'Qty Sent',      value: req.qty_sent ?? '—' },
    { label: 'Qty Received',  value: req.qty_received ?? '—', color: req.discrepancy_flag ? '#DC2626' : undefined },
    { label: 'Date Logged',   value: fmtDate(req.date_logged) },
    { label: 'Req Date',      value: fmtDate(req.customer_request_date) },
    { label: 'Date Sent',     value: fmtDate(req.date_sent) },
    { label: 'Created',       value: fmt(req.created_date) },
    { label: 'Last Updated',  value: fmt(req.updated_date) },
    ...(req.arcola_notes ? [{ label: 'Arcola Notes', value: req.arcola_notes }] : []),
    ...(req.discrepancy_notes ? [{ label: 'Disc. Notes', value: req.discrepancy_notes, color: '#DC2626' }] : []),
  ];

  return (
    <div className="border rounded-lg overflow-hidden" style={{ borderColor: BORDER, borderLeft: `3px solid ${action.border}` }}>
      {/* Row header */}
      <button onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
        style={{ background: expanded ? '#F0F5FF' : '#fff' }}
        onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = '#F7F9FF'; }}
        onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = '#fff'; }}>

        {/* Expand icon */}
        <div className="flex-shrink-0">
          {expanded ? <ChevronDown size={13} style={{ color: BLUE }} /> : <ChevronRight size={13} style={{ color: DIM }} />}
        </div>

        {/* Action badge */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full flex-shrink-0"
          style={{ background: action.bg, border: `1px solid ${action.border}` }}>
          <ActionIcon size={11} style={{ color: action.color }} />
          <span className="text-xs font-semibold" style={{ color: action.color, whiteSpace: 'nowrap' }}>{action.label}</span>
        </div>

        {/* TR ID */}
        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded flex-shrink-0"
          style={{ background: '#DBEAFE', color: BLUE, border: '1px solid #BFDBFE' }}>
          {req.request_id || req.id.slice(0, 8)}
        </span>

        {/* Item */}
        <span className="text-xs font-mono font-semibold flex-1 min-w-0 truncate" style={{ color: TEXT }}>{req.item_code}</span>

        {/* Item type */}
        <span className="text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0"
          style={{ background: '#DBEAFE', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
          {req.item_type}
        </span>

        {/* Status */}
        <StatusPill status={req.status || 'Open'} />

        {/* PL# if set */}
        {req.pl_number && (
          <span className="text-xs font-mono flex-shrink-0" style={{ color: MUTED }}>PL: {req.pl_number}</span>
        )}

        {/* Timestamp */}
        <span className="text-xs flex-shrink-0" style={{ color: DIM }}>{fmt(req.updated_date)}</span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t" style={{ borderColor: BORDER, background: '#F7F9FF' }}>

          {/* Change summary strip */}
          {changeSummary.length > 0 && (
            <div className="px-4 py-2.5 border-b flex flex-wrap gap-3" style={{ borderColor: BORDER, background: '#EFF6FF' }}>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: MUTED, fontSize: 10, alignSelf: 'center' }}>Key Changes</span>
              {changeSummary.map(({ label, value, mono, color, highlight }) => (
                <div key={label} className="flex items-center gap-1.5 px-2 py-1 rounded"
                  style={{ background: highlight ? action.bg : '#fff', border: `1px solid ${highlight ? action.border : BORDER}` }}>
                  <span className="text-xs font-semibold" style={{ color: MUTED, fontSize: 10 }}>{label}</span>
                  <span className="text-xs font-semibold"
                    style={{ color: color || (highlight ? action.color : TEXT), fontFamily: mono ? 'monospace' : undefined }}>
                    {String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Full record snapshot */}
          <div className="px-4 pb-4 pt-3">
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: MUTED, fontSize: 10 }}>Full Record Snapshot</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 md:grid-cols-4">
              {allFields.map(({ label, value, mono, color }) => (
                <div key={label}>
                  <div className="text-xs uppercase tracking-wider mb-0.5" style={{ color: DIM, fontSize: 10 }}>{label}</div>
                  <div className="text-xs font-medium"
                    style={{ color: color || (mono ? TEXT : MUTED), fontFamily: mono ? 'monospace' : undefined }}>
                    {String(value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TransactionHistory() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const qc = useQueryClient();

  const { data: allRows = [], isLoading, refetch } = useQuery({
    queryKey: ['transfer_log'],
    queryFn: () => base44.entities.TransferRequest.list('-updated_date', 500),
  });

  const handleExportCSV = () => {
    const columns = [
      { header: 'Request ID', accessor: 'request_id' },
      { header: 'Item Code', accessor: 'item_code' },
      { header: 'Item Type', accessor: 'item_type' },
      { header: 'Order Type', accessor: 'order_type' },
      { header: 'Status', accessor: 'status' },
      { header: 'PL #', accessor: 'pl_number' },
      { header: 'Qty Requested', accessor: 'qty_requested' },
      { header: 'Qty Sent', accessor: 'qty_sent' },
      { header: 'Qty Received', accessor: 'qty_received' },
      { header: 'Date Logged', accessor: 'date_logged' },
      { header: 'Req Date', accessor: 'customer_request_date' },
      { header: 'Date Sent', accessor: 'date_sent' },
      { header: 'Created', accessor: 'created_date' },
      { header: 'Last Updated', accessor: 'updated_date' },
    ];
    exportToCSV(filtered, 'TransactionHistory', columns);
  };

  const filtered = useMemo(() => {
    return allRows.filter(r => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const sos = (r.sales_orders || []).join(' ');
        const wips = (r.wip_numbers || []).join(' ');
        const searchable = [r.request_id, r.item_code, r.pl_number, sos, wips, r.arcola_notes, r.item_notes].join(' ').toLowerCase();
        if (!searchable.includes(s)) return false;
      }
      return true;
    });
  }, [allRows, search, statusFilter]);

  const statuses = ['Open','In Production','Ready to Ship','In Transit','Received','Not Fully Received','Cancelled'];

  return (
    <div className="flex flex-col h-full" style={{ background: '#F0F5FF' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 border-b flex-shrink-0" style={{ borderColor: BORDER, background: '#fff' }}>
        <History size={16} style={{ color: BLUE }} />
        <h1 className="text-sm font-bold" style={{ color: TEXT }}>Transaction History</h1>
        <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: '#EEF2FF', color: MUTED, border: `1px solid ${BORDER}` }}>
          {filtered.length} records
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={handleExportCSV} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ background: '#EEF2FF', color: BLUE, border: `1px solid ${BORDER}` }}>
            <Download size={12} /> Export CSV
          </button>
          <button onClick={() => refetch()} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg" style={{ background: '#EEF2FF', color: MUTED, border: `1px solid ${BORDER}` }}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-6 py-3 border-b flex-shrink-0" style={{ borderColor: BORDER, background: '#F7F9FF' }}>
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
          <input
            style={{ background: '#fff', border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 6, padding: '5px 10px 5px 28px', fontSize: 12, outline: 'none', width: 260 }}
            placeholder="Search by TR ID, item code, PL#, SO, WIP..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          style={{ background: '#fff', border: `1px solid ${BORDER}`, color: statusFilter ? TEXT : MUTED, borderRadius: 6, padding: '5px 10px', fontSize: 12, outline: 'none', height: 32 }}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => { setSearch(''); setStatusFilter(''); }}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded"
          style={{ color: MUTED, border: `1px solid ${BORDER}`, background: '#fff', height: 32, opacity: (search || statusFilter) ? 1 : 0.4 }}>
          <span>Clear</span>
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-6 py-1.5 border-b flex-shrink-0 flex-wrap" style={{ borderColor: BORDER, background: '#fff' }}>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: DIM, fontSize: 10 }}>Actions:</span>
        {[
          { label: 'Created', color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
          { label: 'Dispatched', color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
          { label: 'Received', color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
          { label: 'Shortfall', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
          { label: 'Updated', color: MUTED, bg: '#EEF2FF', border: BORDER },
        ].map(({ label, color, bg, border }) => (
          <span key={label} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: bg, color, border: `1px solid ${border}` }}>
            {label}
          </span>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: BORDER, borderTopColor: BLUE }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-sm" style={{ color: DIM }}>No records found</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(req => <RequestRow key={req.id} req={req} />)}
          </div>
        )}
      </div>
    </div>
  );
}