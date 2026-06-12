import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, BarChart2 } from 'lucide-react';
import { format, startOfWeek, addDays } from 'date-fns';

const ITEM_TYPES = ['GOWN','TASSEL','STOLE','CAP','TAM','SIGNET','CORD','ZIPPER','MISC','OTHER'];
const BLUE = '#2563EB';
const MUTED = '#6B7BAE';
const BORDER = '#D8E3F8';

function getWeekLabel(dateStr) {
  if (!dateStr) return 'No Date';
  try {
    const d = new Date(dateStr);
    const mon = startOfWeek(d, { weekStartsOn: 1 });
    const sun = addDays(mon, 6);
    return `${format(mon, 'M/d')}–${format(sun, 'M/d')}`;
  } catch { return 'No Date'; }
}

export default function SummaryBar({ rows }) {
  const [open, setOpen] = useState(false);

  const activeRows = useMemo(() =>
    rows.filter(r => !['Received','Cancelled'].includes(r.status)), [rows]);

  const byWeek = useMemo(() => {
    const map = {};
    activeRows.forEach(r => {
      const wk = getWeekLabel(r.customer_request_date);
      if (!map[wk]) map[wk] = {};
      const t = r.item_type || 'OTHER';
      map[wk][t] = (map[wk][t] || 0) + (r.qty_requested || 0);
    });
    return Object.entries(map).sort(([a], [b]) => {
      if (a === 'No Date') return 1;
      if (b === 'No Date') return -1;
      return a.localeCompare(b);
    });
  }, [activeRows]);

  const usedTypes = useMemo(() => {
    const s = new Set();
    byWeek.forEach(([, types]) => Object.keys(types).forEach(t => s.add(t)));
    return ITEM_TYPES.filter(t => s.has(t));
  }, [byWeek]);

  const totalOpen = activeRows.length;
  const totalUnits = activeRows.reduce((s, r) => s + (r.qty_requested || 0), 0);

  return (
    <div style={{ background: '#fff', borderBottom: `1px solid ${BORDER}` }}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-blue-50 transition-colors">
        <BarChart2 size={13} style={{ color: BLUE, flexShrink: 0 }} />
        <span className="text-xs font-semibold" style={{ color: '#1E2A4A' }}>Summary</span>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#EFF6FF', color: BLUE, border: '1px solid #BFDBFE' }}>
          {totalOpen} open · {totalUnits.toLocaleString()} units
        </span>
        <div className="ml-auto" style={{ color: MUTED }}>
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-3 overflow-x-auto" style={{ background: '#F7F9FF', borderTop: `1px solid ${BORDER}` }}>
          {byWeek.length === 0 ? (
            <p className="text-xs py-3" style={{ color: MUTED }}>No active requests</p>
          ) : (
            <table className="border-collapse text-xs mt-2" style={{ minWidth: 400 }}>
              <thead>
                <tr>
                  <th className="text-left pr-6 pb-2 font-semibold" style={{ color: MUTED, whiteSpace: 'nowrap' }}>Week (due)</th>
                  {usedTypes.map(t => (
                    <th key={t} className="text-right px-3 pb-2 font-semibold" style={{ color: MUTED, whiteSpace: 'nowrap' }}>{t}</th>
                  ))}
                  <th className="text-right pl-4 pb-2 font-bold" style={{ color: '#1E2A4A', whiteSpace: 'nowrap' }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {byWeek.map(([week, types]) => {
                  const rowTotal = Object.values(types).reduce((s, v) => s + v, 0);
                  return (
                    <tr key={week} className="border-t" style={{ borderColor: BORDER }}>
                      <td className="pr-6 py-1.5 font-mono font-semibold" style={{ color: BLUE, whiteSpace: 'nowrap' }}>{week}</td>
                      {usedTypes.map(t => (
                        <td key={t} className="text-right px-3 py-1.5 font-mono" style={{ color: types[t] ? '#1E2A4A' : '#D8E3F8' }}>
                          {types[t] ? types[t].toLocaleString() : '—'}
                        </td>
                      ))}
                      <td className="text-right pl-4 py-1.5 font-mono font-bold" style={{ color: '#1E2A4A' }}>
                        {rowTotal.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}