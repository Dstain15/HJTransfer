import { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronDown, Check } from 'lucide-react';

const BORDER = '#D8E3F8';
const MUTED = '#6B7BAE';
const BLUE = '#2563EB';

const inputStyle = {
  background: '#fff',
  border: `1px solid ${BORDER}`,
  color: '#1E2A4A',
  borderRadius: 6,
  fontSize: 12,
  outline: 'none',
  height: 32,
};

function MultiSelect({ placeholder, options, selected, onChange, width = 140 }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (val) => {
    if (selected.includes(val)) onChange(selected.filter(v => v !== val));
    else onChange([...selected, val]);
  };

  const allSelected = selected.length === options.length;
  const selectAll = () => onChange(allSelected ? [] : [...options]);

  const label = selected.length === 0 ? placeholder : selected.length === 1 ? selected[0] : `${selected.length} selected`;

  return (
    <div ref={ref} className="relative" style={{ width }}>
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full px-2.5"
        style={{ ...inputStyle, width: '100%', cursor: 'pointer', gap: 6 }}>
        <span className="truncate" style={{ color: selected.length ? '#1E2A4A' : MUTED }}>{label}</span>
        <ChevronDown size={11} style={{ color: MUTED, flexShrink: 0, transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 rounded overflow-y-auto"
          style={{ background: '#fff', border: `1px solid ${BORDER}`, minWidth: '100%', maxHeight: 220, boxShadow: '0 8px 24px rgba(37,99,235,0.12)' }}>

          {/* Select All / Unselect All */}
          <div onClick={selectAll}
            className="flex items-center gap-2 px-3 py-1.5 cursor-pointer border-b"
            style={{ borderColor: BORDER, background: allSelected ? '#EFF6FF' : '#F7F9FF' }}
            onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
            onMouseLeave={e => e.currentTarget.style.background = allSelected ? '#EFF6FF' : '#F7F9FF'}>
            <div className="flex items-center justify-center w-3.5 h-3.5 rounded flex-shrink-0"
              style={{ border: `1px solid ${allSelected ? BLUE : BORDER}`, background: allSelected ? BLUE : 'transparent' }}>
              {allSelected && <Check size={9} style={{ color: '#fff' }} />}
            </div>
            <span className="text-xs font-semibold" style={{ color: allSelected ? BLUE : MUTED }}>
              {allSelected ? 'Unselect All' : 'Select All'}
            </span>
          </div>

          {options.map(opt => {
            const active = selected.includes(opt);
            return (
              <div key={opt} onClick={() => toggle(opt)}
                className="flex items-center gap-2 px-3 py-1.5 cursor-pointer"
                style={{ color: active ? BLUE : '#1E2A4A', background: active ? '#EFF6FF' : 'transparent' }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F7F9FF'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                <div className="flex items-center justify-center w-3.5 h-3.5 rounded flex-shrink-0"
                  style={{ border: `1px solid ${active ? BLUE : BORDER}`, background: active ? BLUE : 'transparent' }}>
                  {active && <Check size={9} style={{ color: '#fff' }} />}
                </div>
                <span className="text-xs font-medium">{opt}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PLCombobox({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setQuery(''); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(pl => pl.toLowerCase().includes(query.toLowerCase()));

  return (
    <div ref={ref} className="relative" style={{ width: 130 }}>
      <div className="relative">
        <input
          style={{ ...inputStyle, width: '100%', padding: '5px 24px 5px 10px', color: '#1E2A4A' }}
          placeholder={value || 'All PL #s'}
          value={open ? query : (value || '')}
          onFocus={() => setOpen(true)}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
        />
        <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: MUTED }} />
      </div>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 rounded overflow-y-auto w-full"
          style={{ background: '#fff', border: `1px solid ${BORDER}`, maxHeight: 220, boxShadow: '0 8px 24px rgba(37,99,235,0.12)' }}>
          <div onClick={() => { onChange(undefined); setOpen(false); setQuery(''); }}
            className="px-3 py-1.5 cursor-pointer text-xs font-medium border-b"
            style={{ color: MUTED, borderColor: BORDER }}
            onMouseEnter={e => e.currentTarget.style.background = '#F7F9FF'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            All PL #s
          </div>
          {filtered.length === 0 && <div className="px-3 py-2 text-xs" style={{ color: MUTED }}>No matches</div>}
          {filtered.map(pl => (
            <div key={pl} onClick={() => { onChange(pl); setOpen(false); setQuery(''); }}
              className="px-3 py-1.5 cursor-pointer text-xs font-mono font-medium"
              style={{ color: value === pl ? BLUE : '#1E2A4A', background: value === pl ? '#EFF6FF' : 'transparent' }}
              onMouseEnter={e => { if (value !== pl) e.currentTarget.style.background = '#F7F9FF'; }}
              onMouseLeave={e => { if (value !== pl) e.currentTarget.style.background = 'transparent'; }}>
              {pl}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TransferFilters({ filters, onChange, onClear, allRows = [] }) {
  const plNumbers = [...new Set(allRows.filter(r => r.pl_number).map(r => r.pl_number))].sort();
  const hasFilters = filters.search || (filters.status?.length > 0) || (filters.item_type?.length > 0) || (filters.order_type?.length > 0) || filters.pl_number || filters.date_from || filters.date_to;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="relative">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
        <input
          style={{ ...inputStyle, paddingLeft: 28, width: 220, padding: '5px 10px 5px 28px' }}
          placeholder="Item code, sales order, WIP, PL#..."
          value={filters.search || ''}
          onChange={e => onChange({ ...filters, search: e.target.value })}
        />
      </div>

      <MultiSelect placeholder="All Statuses" options={['Open','In Production','Ready to Ship','In Transit','Received','Not Fully Received','Cancelled']}
        selected={filters.status || []} onChange={v => onChange({ ...filters, status: v })} width={150} />

      <MultiSelect placeholder="All Item Types" options={['GOWN','TASSEL','STOLE','CAP','TAM','SIGNET','CORD','ZIPPER','MISC','OTHER']}
        selected={filters.item_type || []} onChange={v => onChange({ ...filters, item_type: v })} width={140} />

      <MultiSelect placeholder="All Order Types" options={['HOMESHIP','ALPHA','BULK','STOCK','RUSH','OTHER']}
        selected={filters.order_type || []} onChange={v => onChange({ ...filters, order_type: v })} width={140} />

      {plNumbers.length > 0 && (
        <PLCombobox value={filters.pl_number} options={plNumbers}
          onChange={v => onChange({ ...filters, pl_number: v })} />
      )}

      <div className="flex items-center gap-1">
        <span className="text-xs font-medium whitespace-nowrap" style={{ color: MUTED }}>Req Date:</span>
        <div className="flex items-center gap-1">
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: MUTED, fontSize: 10 }}>From</span>
            <input type="date" style={{ ...inputStyle, width: 140, padding: '5px 8px 5px 38px' }}
              value={filters.date_from || ''} onChange={e => onChange({ ...filters, date_from: e.target.value })} />
          </div>
          <span className="text-xs" style={{ color: MUTED }}>–</span>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: MUTED, fontSize: 10 }}>To</span>
            <input type="date" style={{ ...inputStyle, width: 140, padding: '5px 8px 5px 28px' }}
              value={filters.date_to || ''} onChange={e => onChange({ ...filters, date_to: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Always-visible Clear Filters button */}
      <button onClick={onClear}
        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded font-medium transition-colors"
        style={{
          color: hasFilters ? '#DC2626' : MUTED,
          border: `1px solid ${hasFilters ? '#FECACA' : BORDER}`,
          background: hasFilters ? '#FEF2F2' : '#fff',
          height: 32,
          opacity: hasFilters ? 1 : 0.5,
        }}
        onMouseEnter={e => { if (hasFilters) e.currentTarget.style.background = '#FEE2E2'; }}
        onMouseLeave={e => e.currentTarget.style.background = hasFilters ? '#FEF2F2' : '#fff'}>
        <X size={11} /> Clear Filters
      </button>
    </div>
  );
}