import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, Truck, Package, Download } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { exportToCSV } from '@/utils/exportToCSV';

const BORDER = '#D8E3F8';
const TEXT = '#1E2A4A';
const MUTED = '#6B7BAE';
const DIM = '#A0AECF';
const BLUE = '#2563EB';
const GREEN = '#16A34A';
const RED = '#DC2626';

const inputStyle = {
  background: '#fff',
  border: `1px solid ${BORDER}`,
  color: TEXT,
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 12,
  outline: 'none',
};

export default function ReceivingHistory() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: allRows = [], isLoading } = useQuery({
    queryKey: ['transfer_log'],
    queryFn: () => base44.entities.TransferRequest.list('-date_logged', 500),
  });

  const receivedRows = useMemo(() => {
    return allRows.filter(r => 
      r.qty_received != null && 
      ['Received', 'Not Fully Received'].includes(r.status)
    );
  }, [allRows]);

  const filteredRows = useMemo(() => {
    let rows = receivedRows;
    
    if (statusFilter !== 'all') {
      rows = rows.filter(r => r.status === statusFilter);
    }
    
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(r => {
        const searchable = [
          r.request_id,
          r.item_code,
          r.pl_number,
          r.sales_order_number,
          ...(r.sales_orders || []),
          ...(r.wip_numbers || [])
        ].join(' ').toLowerCase();
        return searchable.includes(s);
      });
    }
    
    return rows.sort((a, b) => {
      const aDate = a.date_sent || a.updated_date;
      const bDate = b.date_sent || b.updated_date;
      if (aDate > bDate) return -1;
      if (aDate < bDate) return 1;
      return 0;
    });
  }, [receivedRows, search, statusFilter]);

  const groupedByTruck = useMemo(() => {
    const groups = {};
    filteredRows.forEach(r => {
      const key = r.pl_number || 'No PL#';
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredRows]);

  const totalReceived = filteredRows.reduce((sum, r) => sum + (Number(r.qty_received) || 0), 0);

  const handleExportCSV = () => {
    const columns = [
      { header: 'Request ID', accessor: 'request_id' },
      { header: 'Item Code', accessor: 'item_code' },
      { header: 'Item Type', accessor: 'item_type' },
      { header: 'PL #', accessor: 'pl_number' },
      { header: 'Qty Sent', accessor: 'qty_sent' },
      { header: 'Qty Received', accessor: 'qty_received' },
      { header: 'Status', accessor: 'status' },
      { header: 'Date Sent', accessor: 'date_sent' },
      { header: 'Discrepancy Notes', accessor: 'discrepancy_notes' },
    ];
    exportToCSV(filteredRows, 'ReceivingHistory', columns);
  };

  return (
    <div className="flex flex-col h-full" style={{ background: '#F0F5FF' }}>
      {/* Header */}
      <div className="px-5 py-4 border-b flex-shrink-0" style={{ borderColor: BORDER, background: '#fff' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: '#EEF2FF' }}>
              <Truck size={20} style={{ color: BLUE }} />
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: TEXT }}>Receiving History</h1>
              <p className="text-xs" style={{ color: MUTED }}>Track all received shipments and discrepancies</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 rounded-lg" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <span className="text-xs" style={{ color: MUTED }}>Total Units Received: </span>
              <span className="text-sm font-bold" style={{ color: GREEN }}>{totalReceived}</span>
            </div>
            <button onClick={handleExportCSV} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-semibold" style={{ background: '#EEF2FF', color: BLUE, border: `1px solid ${BORDER}` }}>
              <Download size={12} /> Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
            <input
              style={{ ...inputStyle, paddingLeft: 28, width: 280 }}
              placeholder="Search by PL#, item code, request ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            style={{ ...inputStyle, width: 180, color: statusFilter !== 'all' ? TEXT : MUTED }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="Received">Received</option>
            <option value="Not Fully Received">Not Fully Received</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: BORDER, borderTopColor: BLUE }} />
          </div>
        ) : groupedByTruck.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40" style={{ color: DIM }}>
            <Package size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
            <p className="text-sm font-medium">No received shipments found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedByTruck.map(([plNumber, rows]) => (
              <div key={plNumber} className="rounded-xl overflow-hidden" style={{ background: '#fff', border: `1px solid ${BORDER}` }}>
                {/* Truck header */}
                <div className="flex items-center justify-between px-4 py-2.5" style={{ background: '#F7F9FF', borderBottom: `1px solid ${BORDER}` }}>
                  <div className="flex items-center gap-2">
                    <Truck size={14} style={{ color: BLUE }} />
                    <span className="text-sm font-bold" style={{ color: TEXT }}>{plNumber}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#EEF2FF', color: MUTED, border: `1px solid ${BORDER}` }}>
                      {rows.length} item{rows.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {rows.some(r => r.status === 'Not Fully Received') && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#FEF2F2', color: RED, border: '1px solid #FECACA' }}>
                        Has discrepancies
                      </span>
                    )}
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: '#E8EFFE', borderBottom: `1px solid ${BORDER}` }}>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: MUTED, width: 80 }}>Request ID</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: MUTED, width: 140 }}>Item Code</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: MUTED, width: 80 }}>Type</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: MUTED, width: 70 }}>Sent</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: MUTED, width: 70 }}>Received</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: MUTED, width: 100 }}>Status</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: MUTED }}>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => {
                        const isShortfall = row.qty_received < (row.qty_sent || 0);
                        return (
                          <tr key={row.id} style={{ 
                            background: idx % 2 === 0 ? '#fff' : '#F7F9FF',
                            borderLeft: isShortfall ? '3px solid #FCA5A5' : '3px solid transparent'
                          }}>
                            <td className="px-3 py-2 border-b text-xs font-mono" style={{ borderColor: BORDER, color: DIM, fontSize: 10 }}>
                              {row.request_id || '—'}
                            </td>
                            <td className="px-3 py-2 border-b" style={{ borderColor: BORDER }}>
                              <div className="text-xs font-mono font-semibold" style={{ color: TEXT, fontSize: 11 }}>{row.item_code}</div>
                            </td>
                            <td className="px-3 py-2 border-b" style={{ borderColor: BORDER }}>
                              <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: '#DBEAFE', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>{row.item_type}</span>
                            </td>
                            <td className="px-3 py-2 border-b text-xs text-right font-mono font-semibold" style={{ borderColor: BORDER, color: TEXT }}>{row.qty_sent ?? '—'}</td>
                            <td className="px-3 py-2 border-b text-xs text-right font-mono font-bold" style={{ borderColor: BORDER, color: isShortfall ? RED : GREEN }}>
                              {row.qty_received ?? '—'}
                            </td>
                            <td className="px-3 py-2 border-b" style={{ borderColor: BORDER }}>
                              <StatusBadge status={row.status || 'Received'} />
                            </td>
                            <td className="px-3 py-2 border-b text-xs" style={{ borderColor: BORDER, color: MUTED, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {row.discrepancy_notes || row.item_notes || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}