import StatusBadge from './StatusBadge';
import { format } from 'date-fns';

function fmt(d) {
  if (!d) return '—';
  try { return format(new Date(d), 'MM/dd/yy'); } catch { return d; }
}

function Cell({ children, className = '', style = {} }) {
  return (
    <td
      className={`px-3 py-2 text-xs border-b ${className}`}
      style={{ borderColor: '#1A1A1A', color: '#C0C0C0', ...style }}
    >
      {children ?? '—'}
    </td>
  );
}

export default function TransferTable({ rows, onRowClick, highlightDiscrepancy = false }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-16" style={{ color: '#3A3A3A' }}>
        <span className="text-sm">No records found</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ minWidth: 900 }}>
        <thead>
          <tr style={{ background: '#111111', borderBottom: '1px solid #1E1E1E' }}>
            {['ID','Sales Order','Date Logged','Cust. Req Date','Order Type','Item Type','Item Code','Qty Req','Qty Sent','Qty Rcvd','PL #','Date Sent','Status','Notes'].map(h => (
              <th
                key={h}
                className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider"
                style={{ color: '#4A4A4A', whiteSpace: 'nowrap' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const isDiscrep = highlightDiscrepancy && row.discrepancy_flag;
            return (
              <tr
                key={row.id}
                onClick={() => onRowClick && onRowClick(row)}
                className="transition-colors"
                style={{
                  background: isDiscrep ? '#1C0F0F' : i % 2 === 0 ? '#141414' : '#111111',
                  cursor: onRowClick ? 'pointer' : 'default',
                  borderLeft: isDiscrep ? '2px solid #991B1B' : '2px solid transparent',
                }}
              >
                <Cell style={{ color: '#4A4A4A', fontFamily: 'monospace' }}>
                  {row.row_id || row.id?.slice(0,6)}
                </Cell>
                <Cell style={{ color: '#93BBFD', fontFamily: 'monospace', fontSize: 11 }}>
                  {row.sales_order_number || '—'}
                </Cell>
                <Cell>{fmt(row.date_logged)}</Cell>
                <Cell>{fmt(row.customer_request_date)}</Cell>
                <Cell>
                  {row.order_type && (
                    <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: '#1E1E1E', color: '#8A8A8A', border: '1px solid #2A2A2A' }}>
                      {row.order_type}
                    </span>
                  )}
                </Cell>
                <Cell>
                  {row.item_type && (
                    <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: '#1A1E2E', color: '#7FA3E8', border: '1px solid #252F4A' }}>
                      {row.item_type}
                    </span>
                  )}
                </Cell>
                <Cell style={{ fontFamily: 'monospace', fontSize: 11, color: '#D0D0D0', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.item_code}
                </Cell>
                <Cell style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {row.qty_requested ?? '—'}
                </Cell>
                <Cell style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {row.qty_sent ?? '—'}
                </Cell>
                <Cell style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                  color: isDiscrep ? '#FCA5A5' : row.qty_received != null ? '#4ADE80' : '#4A4A4A' }}>
                  {row.qty_received ?? '—'}
                </Cell>
                <Cell style={{ fontFamily: 'monospace', color: '#93BBFD', fontSize: 11 }}>
                  {row.pl_number || '—'}
                </Cell>
                <Cell>{fmt(row.date_sent)}</Cell>
                <Cell><StatusBadge status={row.status || 'Open'} /></Cell>
                <Cell style={{ color: '#5A5A5A', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.arcola_notes || row.item_notes || '—'}
                </Cell>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}