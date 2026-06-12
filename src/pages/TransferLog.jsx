import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TransferFilters from '../components/TransferFilters';
import StatusBadge from '../components/StatusBadge';
import EditPanel from '../components/EditPanel';
import SummaryBar from '../components/SummaryBar';
import { RefreshCw, PlusCircle, AlertTriangle, ChevronDown, ChevronRight, ChevronUp, ChevronsUpDown, Clock, CheckCircle2, Truck, Download } from 'lucide-react';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import FulfillmentPanel from '../components/FulfillmentPanel';
import ResolveShortageModal from '../components/ResolveShortageModal';
import { toast } from 'sonner';
import { exportToCSV } from '@/utils/exportToCSV';

// Light theme palette
const PAGE_BG   = '#F0F5FF';
const THEAD_BG  = '#E8EFFE';
const ROW_EVEN  = '#FFFFFF';
const ROW_ODD   = '#F7F9FF';
const ROW_SEL   = '#EBF2FF';
const ROW_DISC  = '#FFF0F0';
const BORDER    = '#D8E3F8';
const TEXT      = '#1E2A4A';
const MUTED     = '#6B7BAE';
const DIM       = '#A0AECF';
const BLUE      = '#2563EB';
const BLUE_SOFT = '#3B82F6';

function applyFilters(rows, filters) {
  return rows.filter(row => {
    if (filters.status?.length > 0 && !filters.status.includes(row.status)) return false;
    if (filters.item_type?.length > 0 && !filters.item_type.includes(row.item_type)) return false;
    if (filters.order_type?.length > 0 && !filters.order_type.includes(row.order_type)) return false;
    if (filters.search) {
      const s = filters.search.toLowerCase();
      const sos = (row.sales_orders || [row.sales_order_number]).filter(Boolean).join(' ');
      const wips = (row.wip_numbers || []).join(' ');
      const sizes = (row.size_breakdown || []).map(b => b.size).join(' ');
      const searchable = [row.item_code, sos, wips, row.pl_number, row.item_notes, row.request_id, sizes].join(' ').toLowerCase();
      if (!searchable.includes(s)) return false;
    }
    if (filters.pl_number && row.pl_number !== filters.pl_number) return false;
    if (filters.date_from && row.date_logged && row.date_logged < filters.date_from) return false;
    if (filters.date_to && row.date_logged && row.date_logged > filters.date_to) return false;
    return true;
  });
}

const STATUS_ORDER = { 'Open': 0, 'In Production': 0, 'Ready to Ship': 0, 'Not Fully Received': 0, 'In Transit': 1, 'Cancelled': 2, 'Received': 3, 'Received Partial': 3 };

const fmt = (d) => { if (!d) return '—'; try { return format(new Date(d), 'M/d/yy'); } catch { return d; } };

function getUrgency(dateStr, status) {
  if (!dateStr) return null;
  if (['Received', 'Received Partial', 'Cancelled'].includes(status)) return null;
  try {
    const days = differenceInCalendarDays(parseISO(dateStr), new Date());
    if (days < 0) return { label: 'Late', icon: AlertTriangle, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' };
    if (days === 0) return { label: 'Due Today', icon: AlertTriangle, color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' };
    if (days <= 3) return { label: 'Due Soon', icon: AlertTriangle, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' };
    if (days <= 7) return { label: `${days}d`, icon: Clock, color: '#0369A1', bg: '#F0F9FF', border: '#BAE6FD' };
    return null;
  } catch { return null; }
}

function MultiValueCell({ values, color = BLUE }) {
  const [open, setOpen] = useState(false);
  if (!values || values.length === 0) return <span style={{ color: DIM }}>—</span>;
  if (values.length === 1) return <span className="text-xs font-mono font-medium" style={{ color, fontSize: 11 }}>{values[0]}</span>;
  return (
    <div>
      <button onClick={e => { e.stopPropagation(); setOpen(o => !o); }} className="flex items-center gap-1 text-xs font-mono font-medium" style={{ color, fontSize: 11 }}>
        {values[0]}
        <span className="ml-1 px-1 rounded" style={{ background: '#DBEAFE', color: BLUE, border: '1px solid #BFDBFE', fontSize: 10 }}>+{values.length - 1}</span>
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
      </button>
      {open && (
        <div className="mt-1 space-y-0.5" onClick={e => e.stopPropagation()}>
          {values.slice(1).map((v, i) => <div key={i} className="text-xs font-mono" style={{ color: MUTED, fontSize: 11 }}>{v}</div>)}
        </div>
      )}
    </div>
  );
}

function InlineStatusSelect({ row, onSave }) {
  const [open, setOpen] = useState(false);
  const options = ['Open','In Production','Ready to Ship','In Transit','Received','Not Fully Received','Received Partial','Cancelled'];
  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1">
        <StatusBadge status={row.status || 'Open'} />
        <ChevronDown size={9} style={{ color: DIM }} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 rounded py-1 shadow-lg" style={{ background: '#fff', border: `1px solid ${BORDER}`, minWidth: 180, boxShadow: '0 4px 20px rgba(37,99,235,0.12)' }}>
          {options.map(s => (
            <div key={s} className="px-3 py-1.5 text-xs cursor-pointer"
              style={{ color: row.status === s ? BLUE : TEXT, background: row.status === s ? '#EBF2FF' : 'transparent', fontWeight: row.status === s ? 600 : 400 }}
              onMouseEnter={e => { if (row.status !== s) e.currentTarget.style.background = '#F0F5FF'; }}
              onMouseLeave={e => { if (row.status !== s) e.currentTarget.style.background = 'transparent'; }}
              onClick={() => { onSave(row.id, { status: s }); setOpen(false); }}>
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <ChevronsUpDown size={10} style={{ color: DIM, marginLeft: 3 }} />;
  return sortDir === 'asc' ? <ChevronUp size={10} style={{ color: BLUE, marginLeft: 3 }} /> : <ChevronDown size={10} style={{ color: BLUE, marginLeft: 3 }} />;
}

const SIZES_R = ['40R','42R','44R','46R','48R','50R','52R','54R','56R','58R','60R','62R','64R','66R','68R','70R'];
const SIZES_X = ['40X','42X','44X','46X','48X','50X','52X','54X','56X','58X','60X','62X','64X','66X','68X','70X'];
const SIZES_Z = ['40Z','42Z','44Z','46Z','48Z','50Z','52Z','54Z','56Z','58Z','60Z','62Z','64Z','66Z','68Z','70Z'];

// Returns all individual size entries that have any qty
function getSizeEntries(breakdown) {
  if (!breakdown) return [];
  return breakdown.filter(b => b.qty_requested || b.qty_sent || b.qty_received);
}

function SizeExpandRows({ breakdown, onSentChange }) {
  const entries = getSizeEntries(breakdown);
  return (
    <>
      {entries.map((e, idx) => {
        const isShortfall = e.qty_received != null && e.qty_sent != null && e.qty_received < e.qty_sent;
        const rowBg = idx % 2 === 0 ? '#EEF4FF' : '#F5F8FF';
        return (
          <tr key={e.size} style={{ background: rowBg, borderLeft: '3px solid #93C5FD' }}>
            <td className="border-b" style={{ borderColor: BORDER }} />
            <td className="border-b" style={{ borderColor: BORDER }} />
            <td className="border-b" style={{ borderColor: BORDER }} />
            <td className="border-b" style={{ borderColor: BORDER }} />
            <td className="border-b" style={{ borderColor: BORDER }} />
            <td className="border-b" style={{ borderColor: BORDER }} />
            {/* Size label right-aligned */}
            <td className="px-3 py-1 border-b text-right" style={{ borderColor: BORDER }}>
              <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-xs" style={{ background: '#DBEAFE', color: '#1D4ED8', border: '1px solid #BFDBFE', fontSize: 11 }}>{e.size}</span>
            </td>
            {/* Req */}
            <td className="px-3 py-1 border-b text-xs text-right font-mono font-semibold" style={{ borderColor: BORDER, color: '#1E2A4A' }}>
              {e.qty_requested || '—'}
            </td>
            {/* Sent — read only in main table */}
            <td className="px-3 py-1 border-b text-xs text-right font-mono font-medium" style={{ borderColor: BORDER, color: e.qty_sent != null ? TEXT : DIM }}>
              {e.qty_sent ?? '—'}
            </td>
            {/* Rcvd */}
            <td className="px-3 py-1 border-b text-xs text-right font-mono font-semibold" style={{ borderColor: BORDER, color: isShortfall ? '#DC2626' : e.qty_received != null ? '#16A34A' : DIM }}>
              {e.qty_received ?? '—'}
            </td>
            <td className="border-b" style={{ borderColor: BORDER }} />
          </tr>
        );
      })}
    </>
  );
}

export default function TransferLog() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({});
  const [quickFilter, setQuickFilter] = useState('all');
  const [selectedRow, setSelectedRow] = useState(null);
  const [focusField, setFocusField] = useState(null);
  const [sortCol, setSortCol] = useState('customer_request_date');
  const [sortDir, setSortDir] = useState('asc');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [fulfillRow, setFulfillRow] = useState(null);
  const [resolveRow, setResolveRow] = useState(null);

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ['transfer_log'],
    queryFn: () => base44.entities.TransferRequest.list('-date_logged', 500),
  });

  const baseFiltered = useMemo(() => applyFilters(rows, filters), [rows, filters]);

  const discrepCount = rows.filter(r => r.status === 'Not Fully Received').length;

  const STATUS_PRIORITY = { 'Open': 0, 'In Production': 1, 'Ready to Ship': 2 };

  const filtered = useMemo(() => {
    let r = baseFiltered;
    if (quickFilter === 'open') r = r.filter(x => ['Open','In Production','Ready to Ship'].includes(x.status));
    if (quickFilter === 'problems') r = r.filter(x => (x.status !== 'Received Partial' && (x.status === 'Not Fully Received' || x.discrepancy_flag)) || x.missed_shortage);
    if (quickFilter === 'ship') r = r.filter(x => ['Ready to Ship','In Transit'].includes(x.status));
    return [...r].sort((a, b) => {
      if (quickFilter === 'open') {
        const ap = STATUS_PRIORITY[a.status] ?? 99;
        const bp = STATUS_PRIORITY[b.status] ?? 99;
        if (ap !== bp) return ap - bp;
      }
      if (quickFilter === 'problems') {
        // Unresolved (Not Fully Received / discrepancy) first, resolved (missed shortage re-requests) after
        const aUnresolved = a.status === 'Not Fully Received' || (a.discrepancy_flag && !a.missed_shortage) ? 0 : 1;
        const bUnresolved = b.status === 'Not Fully Received' || (b.discrepancy_flag && !b.missed_shortage) ? 0 : 1;
        if (aUnresolved !== bUnresolved) return aUnresolved - bUnresolved;
      }
      if (quickFilter === 'ship') {
        if (a.status === 'Ready to Ship' && b.status === 'In Transit') return -1;
        if (a.status === 'In Transit' && b.status === 'Ready to Ship') return 1;
      }
      const ao = STATUS_ORDER[a.status] ?? 0;
      const bo = STATUS_ORDER[b.status] ?? 0;
      if (ao !== bo) return ao - bo;
      const av = a[sortCol] || '';
      const bv = b[sortCol] || '';
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [baseFiltered, quickFilter, sortCol, sortDir]);



  const handleExportCSV = () => {
    // Expand rows with size breakdown into separate rows
    const expandedRows = filtered.flatMap(row => {
      if (row.size_breakdown && row.size_breakdown.length > 0) {
        // Filter to only sizes with qty
        const sizesWithQty = row.size_breakdown.filter(s => s.qty_requested || s.qty_sent || s.qty_received);
        if (sizesWithQty.length > 0) {
          return sizesWithQty.map(sizeEntry => ({
            ...row,
            item_code: `${row.item_code}${sizeEntry.size}`,
            qty_requested: sizeEntry.qty_requested || 0,
            qty_sent: sizeEntry.qty_sent || 0,
            qty_received: sizeEntry.qty_received || 0,
          }));
        }
      }
      return [row];
    });

    const columns = [
      { header: 'Request ID', accessor: 'request_id' },
      { header: 'Status', accessor: 'status' },
      { header: 'Sales Order(s)', accessor: row => (row.sales_orders || [row.sales_order_number]).filter(Boolean).join(', ') },
      { header: 'WIP #(s)', accessor: row => (row.wip_numbers || []).join(', ') },
      { header: 'Date Logged', accessor: 'date_logged' },
      { header: 'Request Date', accessor: 'customer_request_date' },
      { header: 'Order Type', accessor: 'order_type' },
      { header: 'Item Type', accessor: 'item_type' },
      { header: 'Item Code', accessor: 'item_code' },
      { header: 'Item Notes', accessor: 'item_notes' },
      { header: 'Qty Requested', accessor: 'qty_requested' },
      { header: 'Qty Sent', accessor: 'qty_sent' },
      { header: 'Qty Received', accessor: 'qty_received' },
      { header: 'PL #', accessor: 'pl_number' },
      { header: 'Date Sent', accessor: 'date_sent' },
      { header: 'Discrepancy Notes', accessor: 'discrepancy_notes' },
      { header: 'Arcola Notes', accessor: 'arcola_notes' },
    ];
    exportToCSV(expandedRows, 'TransferLog', columns);
  };

  const handleSave = async (id, update) => {
    await base44.entities.TransferRequest.update(id, update);
    qc.invalidateQueries({ queryKey: ['transfer_log'] });
    setSelectedRow(null);
    setFocusField(null);
  };

  const handleSilentSave = async (id, update) => {
    await base44.entities.TransferRequest.update(id, update);
    qc.invalidateQueries({ queryKey: ['transfer_log'] });
    const row = rows.find(r => r.id === id);
    if (update.status) toast.success(`Status updated to "${update.status}"${row ? ` — ${row.item_code}` : ''}`);
  };

  const handleFulfillSave = async (id, update) => {
    await base44.entities.TransferRequest.update(id, update);
    qc.invalidateQueries({ queryKey: ['transfer_log'] });
    setFulfillRow(null);
  };

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const toggleExpand = (id, e) => {
    e.stopPropagation();
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openPanel = (row) => {
    if (!row) {
      setSelectedRow(null);
      setFocusField(null);
      return;
    }
    // If clicking the same row, close it
    if (selectedRow?.id === row.id) {
      setSelectedRow(null);
      setFocusField(null);
      return;
    }
    // If clicking a different row while one is already open, just close it (don't auto-open the new row)
    if (selectedRow) {
      setSelectedRow(null);
      setFocusField(null);
      return;
    }
    setSelectedRow(row);
    setFocusField(null);
  };

  const cols = [
    { label: 'Status', key: 'status', w: 160 },
    { label: 'Sales Order(s)', key: 'sales_orders', w: 120 },
    { label: 'WIP #(s)', key: 'wip_numbers', w: 110 },
    { label: 'Req Date', key: 'customer_request_date', w: 80, sortable: true },
    { label: 'Type', key: 'order_type', w: 70 },
    { label: 'Item', key: 'item_type', w: 60 },
    { label: 'Item Code / Notes', key: 'item_code', w: null },
    { label: 'Req', key: 'qty_requested', w: 45 },
    { label: 'Sent', key: 'qty_sent', w: 45 },
    { label: 'Rcvd', key: 'qty_received', w: 45 },
    { label: 'PL #', key: 'pl_number', w: 80 },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: PAGE_BG }}>
      <SummaryBar rows={rows} />

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0" style={{ borderColor: BORDER, background: '#fff' }}>
        <div className="flex items-center gap-3">
          <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: '#EEF2FF', color: MUTED, border: `1px solid ${BORDER}` }}>
            {filtered.length} rows
          </span>
          <div className="flex items-center rounded-lg overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
            {[{ key: 'all', label: 'All' }, { key: 'open', label: 'Open' }, { key: 'ship', label: 'Ship' }, { key: 'problems', label: 'Problems' }].map(({ key, label }) => (
              <button key={key} onClick={() => setQuickFilter(key)}
                className="px-3 py-1 text-xs font-medium transition-colors"
                style={{
                  background: quickFilter === key ? BLUE : '#fff',
                  color: quickFilter === key ? '#fff' : MUTED,
                  borderRight: key !== 'problems' ? `1px solid ${BORDER}` : 'none',
                }}>
                {label}
                {key === 'problems' && discrepCount > 0 && (
                  <span className="ml-1.5 px-1.5 rounded-full" style={{ background: '#FEE2E2', color: '#DC2626', fontSize: 10 }}>{discrepCount}</span>
                )}
              </button>
            ))}
          </div>

        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCSV} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ background: '#EEF2FF', color: BLUE, border: `1px solid ${BORDER}` }}>
            <Download size={12} /> Export CSV
          </button>
          <Link to="/submit" className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ background: BLUE, color: '#fff' }}>
            <PlusCircle size={12} /> New Request
          </Link>
          <button onClick={() => { setSortCol('customer_request_date'); setSortDir('asc'); }} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg" style={{ background: '#EEF2FF', color: MUTED, border: `1px solid ${BORDER}` }} title="Reset sort order">
            <ChevronsUpDown size={12} /> Sort
          </button>
          <button onClick={() => refetch()} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg" style={{ background: '#EEF2FF', color: MUTED, border: `1px solid ${BORDER}` }} title="Refresh">
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-2 border-b flex-shrink-0" style={{ borderColor: BORDER, background: '#F7F9FF' }}>
        <TransferFilters filters={filters} onChange={setFilters} onClear={() => setFilters({})} allRows={rows} />
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex-1 overflow-auto" style={{ position: 'relative', zIndex: selectedRow ? 20 : 10 }}>
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: BORDER, borderTopColor: BLUE }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm" style={{ color: DIM }}>No records found</div>
          ) : (
            <table className="border-collapse w-full">
              <thead className="sticky top-0 z-10">
                <tr style={{ background: THEAD_BG, borderBottom: `1px solid ${BORDER}` }}>
                  {cols.map(({ label, key, w, sortable }) => (
                    <th key={key}
                      className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider select-none"
                      style={{ color: sortCol === key ? BLUE : MUTED, whiteSpace: 'nowrap', width: w || undefined, cursor: sortable ? 'pointer' : 'default' }}
                      onClick={() => sortable && toggleSort(key)}>
                      <span className="inline-flex items-center">
                        {label}
                        {sortable && <SortIcon col={key} sortCol={sortCol} sortDir={sortDir} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => {
                  const isSelected = selectedRow?.id === row.id;
                  const isDimmed = ['Received', 'Received Partial', 'Cancelled'].includes(row.status);
                  const rowBg = isSelected ? ROW_SEL : i % 2 === 0 ? ROW_EVEN : ROW_ODD;
                  const isExpanded = expandedRows.has(row.id);
                  const sizeEntries = row.size_breakdown?.filter(b => b.qty_requested || b.qty_sent || b.qty_received) || [];
                  const hasSizes = sizeEntries.length > 0;
                  return (
                    <React.Fragment key={row.id}>
                      <tr className="cursor-pointer"
                        onClick={() => openPanel(row)}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#EBF2FF'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = rowBg; }}
                        style={{
                          background: rowBg,
                          borderLeft: isSelected ? `3px solid ${BLUE}` : '3px solid transparent',
                          opacity: isDimmed && !isSelected ? 0.5 : 1,
                        }}>
                        <td className="px-3 py-2 border-b" style={{ borderColor: BORDER }}>
                          <InlineStatusSelect row={row} onSave={handleSave} />
                        </td>
                        <td className="px-3 py-2 border-b" style={{ borderColor: BORDER }}>
                          <MultiValueCell values={row.sales_orders?.length > 0 ? row.sales_orders : (row.sales_order_number ? [row.sales_order_number] : [])} color={BLUE} />
                        </td>
                        <td className="px-3 py-2 border-b" style={{ borderColor: BORDER }}>
                          <MultiValueCell values={row.wip_numbers || []} color="#7C3AED" />
                        </td>
                        <td className="px-3 py-2 border-b" style={{ borderColor: BORDER, whiteSpace: 'nowrap' }}>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs" style={{ color: MUTED }}>{fmt(row.customer_request_date)}</span>
                            {(() => {
                              const u = getUrgency(row.customer_request_date, row.status);
                              if (!u) return null;
                              const UIcon = u.icon;
                              return (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold"
                                  style={{ background: u.bg, color: u.color, border: `1px solid ${u.border}`, fontSize: 10 }}>
                                  <UIcon size={9} />
                                  {u.label}
                                </span>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-3 py-2 border-b" style={{ borderColor: BORDER }}>
                          {row.order_type && <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: '#EEF2FF', color: MUTED, border: `1px solid ${BORDER}` }}>{row.order_type}</span>}
                        </td>
                        <td className="px-3 py-2 border-b" style={{ borderColor: BORDER }}>
                          {row.item_type && <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: '#DBEAFE', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>{row.item_type}</span>}
                        </td>
                        <td className="px-3 py-2 border-b" style={{ borderColor: BORDER }}>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono font-semibold" style={{ color: TEXT, whiteSpace: 'nowrap', fontSize: 11 }}>{row.item_code}</span>
                            {row.missed_shortage && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', fontSize: 9 }} title={`Shortage re-request from ${row.shortage_of_request_id || 'original'}`}>
                                Missed
                              </span>
                            )}
                            {row.status === 'Not Fully Received' && (
                              <button onClick={e => { e.stopPropagation(); setResolveRow(row); }}
                                className="text-xs px-1.5 py-0.5 rounded font-semibold"
                                style={{ background: '#FFF7ED', color: '#EA580C', border: '1px solid #FED7AA', fontSize: 10, whiteSpace: 'nowrap' }}>
                                Resolve
                              </button>
                            )}
                            {hasSizes && (
                              <button
                                onClick={e => toggleExpand(row.id, e)}
                                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold"
                                style={{ background: isExpanded ? '#DBEAFE' : '#EEF2FF', color: '#2563EB', border: '1px solid #BFDBFE', fontSize: 10 }}
                                title="Show size breakdown">
                                {isExpanded ? <ChevronDown size={9}/> : <ChevronRight size={9}/>} {sizeEntries.length} sizes
                              </button>
                            )}
                          </div>
                          {row.item_notes && (
                            <div className="text-xs mt-0.5" style={{ color: MUTED, fontSize: 10, maxWidth: 320, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{row.item_notes}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 border-b text-xs text-right font-mono font-medium" style={{ borderColor: BORDER, color: MUTED }}>
                          {row.qty_requested ?? '—'}
                        </td>
                        <td className="px-3 py-2 border-b text-xs text-right font-mono font-medium" style={{ borderColor: BORDER, color: TEXT }}>
                          {row.qty_sent ?? '—'}
                        </td>
                        <td className="px-3 py-2 border-b text-xs text-right font-mono font-medium" style={{ borderColor: BORDER, color: row.qty_received != null ? '#16A34A' : DIM }}>
                          {row.qty_received ?? '—'}
                        </td>
                        <td className="px-3 py-2 border-b" style={{ borderColor: BORDER }}
                          onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setFulfillRow(row)}
                            className="flex items-center gap-1 text-xs font-mono font-semibold px-2 py-0.5 rounded transition-colors"
                            style={{
                              background: row.pl_number ? '#EEF2FF' : 'transparent',
                              color: row.pl_number ? BLUE_SOFT : DIM,
                              border: row.pl_number ? '1px solid #BFDBFE' : '1px solid transparent',
                              whiteSpace: 'nowrap',
                              fontSize: 11,
                            }}
                            title="Edit fulfilment">
                            <Truck size={10} />
                            {row.pl_number || 'Assign'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && hasSizes && (
                        <SizeExpandRows breakdown={row.size_breakdown} />
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {selectedRow && (
          <>
            <div className="absolute inset-y-0 left-0 z-30" style={{ width: 'calc(100% - 340px)', background: 'rgba(30,42,74,0.08)' }} onClick={() => { setSelectedRow(null); setFocusField(null); }} />
            <div className="absolute inset-y-0 right-0 z-40" style={{ width: 340 }}>
              <EditPanel
                row={selectedRow}
                focusField={focusField}
                allRows={rows}
                onClose={() => { setSelectedRow(null); setFocusField(null); }}
                onSave={handleSave}
              />
            </div>
          </>
        )}
      </div>

      {resolveRow && (
        <ResolveShortageModal
          row={resolveRow}
          onClose={() => setResolveRow(null)}
          onResolved={() => { setResolveRow(null); qc.invalidateQueries({ queryKey: ['transfer_log'] }); }}
        />
      )}

      {fulfillRow && (
        <FulfillmentPanel
          row={fulfillRow}
          allRows={rows}
          onClose={() => setFulfillRow(null)}
          onTryClose={() => setFulfillRow(null)}
          onSave={handleFulfillSave}
        />
      )}
    </div>
  );
}