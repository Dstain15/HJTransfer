import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle, AlertTriangle, Truck, Search, ChevronDown, Grid3x3, X, Plus } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import AddTruckLineModal from '../components/AddTruckLineModal';
import SizeBreakdownModal from '../components/SizeBreakdownModal';
import { rollupBreakdown } from '../components/SizeBreakdownGrid';

const BORDER = '#D8E3F8';
const TEXT   = '#1E2A4A';
const MUTED  = '#6B7BAE';
const DIM    = '#A0AECF';
const BLUE   = '#2563EB';

const inputStyle = {
  background: '#fff',
  border: `1px solid ${BORDER}`,
  color: TEXT,
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 12,
  outline: 'none',
};

export default function ReceiveTruck() {
  const qc = useQueryClient();
  const [selectedPL, setSelectedPL] = useState('');
  const [viewMode, setViewMode] = useState('open');
  const [qtyInputs, setQtyInputs] = useState({});
  const [sizeBreakdownInputs, setSizeBreakdownInputs] = useState({});
  const [notes, setNotes] = useState({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [openSizeModal, setOpenSizeModal] = useState(null);
  const [truckSearch, setTruckSearch] = useState('');
  const [showAddLine, setShowAddLine] = useState(false);

  const { data: allRows = [], isLoading } = useQuery({
    queryKey: ['transfer_log'],
    queryFn: () => base44.entities.TransferRequest.list('-date_logged', 500),
  });

  const openTrucks = useMemo(() => {
    const map = {};
    allRows.filter(r => r.pl_number && r.status === 'In Transit').forEach(r => {
      if (!map[r.pl_number]) map[r.pl_number] = 0;
      map[r.pl_number]++;
    });
    return Object.entries(map).map(([pl, count]) => ({ pl, count })).sort((a, b) => a.pl.localeCompare(b.pl));
  }, [allRows]);

  const receivedTrucks = useMemo(() => {
    const map = {};
    allRows.filter(r => r.pl_number && (r.status === 'Received' || r.status === 'Not Fully Received')).forEach(r => {
      if (!map[r.pl_number]) map[r.pl_number] = { count: 0, status: r.status };
      map[r.pl_number].count++;
    });
    return Object.entries(map).map(([pl, v]) => ({ pl, ...v })).sort((a, b) => a.pl.localeCompare(b.pl));
  }, [allRows]);

  const allTrucks = viewMode === 'open' ? openTrucks : receivedTrucks;
  const trucks = useMemo(() => {
    if (!truckSearch) return allTrucks;
    return allTrucks.filter(t => t.pl.toLowerCase().includes(truckSearch.toLowerCase()));
  }, [allTrucks, truckSearch]);

  const truckRows = selectedPL
    ? allRows.filter(r => r.pl_number && r.pl_number.trim().toUpperCase() === selectedPL.trim().toUpperCase())
    : [];

  const handleSelectTruck = (pl) => {
    setSelectedPL(pl);
    setQtyInputs({});
    setNotes({});
    setDone(false);
  };

  const handleReceive = async () => {
    setSaving(true);
    for (const row of truckRows) {
      let qtyRcvd;
      if (row.size_breakdown?.length > 0) {
        const sbInput = sizeBreakdownInputs[row.id] || row.size_breakdown;
        qtyRcvd = rollupBreakdown(sbInput, 'qty_received') || 0;
      } else {
        qtyRcvd = Number(qtyInputs[row.id] ?? row.qty_received ?? 0);
      }
      const qtySent = row.size_breakdown?.length > 0 ? (rollupBreakdown(row.size_breakdown, 'qty_sent') || 0) : (row.qty_sent ?? 0);
      const discrepancy = qtyRcvd < qtySent;
      await base44.entities.TransferRequest.update(row.id, {
        qty_received: qtyRcvd,
        size_breakdown: row.size_breakdown?.length > 0 ? sizeBreakdownInputs[row.id] : undefined,
        discrepancy_flag: discrepancy,
        discrepancy_notes: notes[row.id] || row.discrepancy_notes || '',
        status: discrepancy ? 'Not Fully Received' : 'Received',
      });
    }
    qc.invalidateQueries({ queryKey: ['transfer_log'] });
    setSaving(false);
    setDone(true);
    setSizeBreakdownInputs({});
  };

  const pendingRows = truckRows.filter(r => r.status === 'In Transit');
  const allFilled = pendingRows.length > 0 && pendingRows.every(r => {
    if (r.size_breakdown?.length > 0) {
      const sb = sizeBreakdownInputs[r.id] || r.size_breakdown;
      return sb.some(s => s.qty_received != null && s.qty_received !== '');
    }
    return qtyInputs[r.id] !== undefined && qtyInputs[r.id] !== '';
  });
  const discrepCount = pendingRows.filter(r => {
    const qr = Number(qtyInputs[r.id]);
    return !isNaN(qr) && qr < (r.qty_sent ?? 0);
  }).length;

  return (
    <div className="flex h-full" style={{ background: '#F0F5FF' }}>
      {/* Truck list sidebar */}
      <div className="flex flex-col flex-shrink-0 border-r" style={{ width: 220, background: '#fff', borderColor: BORDER }}>
        <div className="px-3 py-3 border-b" style={{ borderColor: BORDER }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: MUTED }}>Trucks</p>
          <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
            {[{ key: 'open', label: 'Pending' }, { key: 'received', label: 'Received' }].map(({ key, label }) => (
              <button key={key} onClick={() => { setViewMode(key); setSelectedPL(''); setDone(false); }}
                className="flex-1 py-1.5 text-xs font-medium transition-colors"
                style={{ background: viewMode === key ? BLUE : '#fff', color: viewMode === key ? '#fff' : MUTED }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Truck search */}
        <div className="px-3 py-2 border-b" style={{ borderColor: BORDER }}>
          <div className="relative">
            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
            <input
              style={{ ...inputStyle, paddingLeft: 26, width: '100%', fontSize: 11 }}
              placeholder="Search truck..."
              value={truckSearch}
              onChange={e => setTruckSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {isLoading && (
            <div className="flex justify-center py-6">
              <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: BORDER, borderTopColor: BLUE }} />
            </div>
          )}
          {!isLoading && trucks.length === 0 && (
            <p className="text-xs text-center py-6" style={{ color: DIM }}>{truckSearch ? 'No matching trucks' : 'No trucks'}</p>
          )}
          {trucks.map(({ pl, count, status }) => (
            <button key={pl} onClick={() => handleSelectTruck(pl)}
              className="w-full flex items-center justify-between px-3 py-2 text-left transition-colors"
              style={{
                background: selectedPL === pl ? '#EFF6FF' : 'transparent',
                borderLeft: selectedPL === pl ? `3px solid ${BLUE}` : '3px solid transparent',
              }}>
              <div className="flex items-center gap-2">
                <Truck size={12} style={{ color: selectedPL === pl ? BLUE : DIM, flexShrink: 0 }} />
                <span className="text-xs font-mono font-semibold" style={{ color: selectedPL === pl ? BLUE : TEXT }}>{pl}</span>
              </div>
              <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{
                background: status === 'Not Fully Received' ? '#FEF2F2' : '#EEF2FF',
                color: status === 'Not Fully Received' ? '#DC2626' : MUTED,
                border: `1px solid ${status === 'Not Fully Received' ? '#FECACA' : BORDER}`,
                fontSize: 10,
              }}>
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedPL ? (
          <div className="flex flex-col items-center justify-center h-full" style={{ color: DIM }}>
            <Truck size={32} style={{ marginBottom: 12, color: '#BFDBFE' }} />
            <p className="text-sm font-medium">Select a truck to receive</p>
          </div>
        ) : (
          <>
            {/* Truck header */}
            <div className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0" style={{ borderColor: BORDER, background: '#fff' }}>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold" style={{ color: TEXT }}>PL # {selectedPL}</span>
                <span className="text-xs" style={{ color: MUTED }}>{truckRows.length} line item(s)</span>
                {truckRows[0] && <StatusBadge status={truckRows[0].status || 'In Transit'} />}
              </div>
              <div className="flex items-center gap-2">
                {viewMode === 'open' && (
                  <button onClick={() => setShowAddLine(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: '#EEF2FF', color: BLUE, border: '1px solid #BFDBFE' }}>
                    <Plus size={12} /> Add Lines
                  </button>
                )}
                {done && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D' }}>
                    <CheckCircle size={13} />
                    Truck finalized! {discrepCount > 0 ? `${discrepCount} discrepanc${discrepCount === 1 ? 'y' : 'ies'} flagged.` : 'All matched.'}
                  </div>
                )}
                {discrepCount > 0 && !done && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
                    <AlertTriangle size={12} />
                    {discrepCount} shortfall{discrepCount > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto" style={{ background: '#F7F9FF' }}>
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr style={{ background: '#E8EFFE', borderBottom: `1px solid ${BORDER}` }}>
                    {['Req ID', 'Item Type', 'Item Code', 'Item Notes', 'Qty Sent', 'Qty Received', 'Disc. Notes', 'Status'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: MUTED, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {truckRows.map((row, i) => {
                    const isPending = row.status === 'In Transit';
                    const qtyVal = qtyInputs[row.id] !== undefined ? qtyInputs[row.id] : (row.qty_received ?? '');
                    const qtySent = row.qty_sent ?? 0;
                    const isShort = qtyVal !== '' && Number(qtyVal) < qtySent;
                    return (
                      <tr key={row.id} style={{
                        background: isShort ? '#FFF0F0' : i % 2 === 0 ? '#fff' : '#F7F9FF',
                        borderLeft: isShort ? '3px solid #FCA5A5' : '3px solid transparent',
                      }}>
                        <td className="px-3 py-2 border-b text-xs font-mono" style={{ borderColor: BORDER, color: DIM, fontSize: 10 }}>
                          {row.request_id || '—'}
                        </td>
                        <td className="px-3 py-2 border-b" style={{ borderColor: BORDER }}>
                          <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: '#DBEAFE', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>{row.item_type}</span>
                        </td>
                        <td className="px-3 py-2 border-b" style={{ borderColor: BORDER, minWidth: 160 }}>
                          <div className="text-xs font-mono font-semibold" style={{ color: TEXT, wordBreak: 'break-all', fontSize: 11 }}>{row.item_code}</div>
                        </td>
                        <td className="px-3 py-2 border-b text-xs" style={{ borderColor: BORDER, color: MUTED, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.item_notes || '—'}</td>
                        <td className="px-3 py-2 border-b text-xs text-right font-mono font-semibold" style={{ borderColor: BORDER, color: TEXT }}>{qtySent}</td>
                        <td className="px-3 py-2 border-b" style={{ borderColor: BORDER }}>
                          {isPending ? (
                            row.size_breakdown?.length > 0 ? (
                              <button
                                onClick={() => setOpenSizeModal(row.id)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                                style={{ background: BLUE, color: '#fff', width: '100%', justifyContent: 'center' }}>
                                <Grid3x3 size={11} /> Enter by Size
                              </button>
                            ) : (
                              <input type="text" inputMode="numeric" pattern="[0-9]*"
                                style={{ ...inputStyle, width: 80, textAlign: 'right', borderColor: isShort ? '#FCA5A5' : BORDER, WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                                value={qtyVal}
                                onChange={e => {
                                  const cleaned = e.target.value.replace(/\D/g, '').slice(0, 5);
                                  setQtyInputs(q => ({ ...q, [row.id]: cleaned }));
                                }}
                                placeholder={String(qtySent)}
                              />
                            )
                          ) : (
                            <span className="text-xs font-mono text-right block font-bold" style={{ color: row.qty_received != null && row.qty_received < qtySent ? '#DC2626' : '#16A34A' }}>
                              {row.qty_received ?? '—'}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 border-b" style={{ borderColor: BORDER }}>
                          {(isPending && isShort) ? (
                            <input style={{ ...inputStyle, width: 140, fontSize: 11 }}
                              value={notes[row.id] || ''}
                              onChange={e => setNotes(n => ({ ...n, [row.id]: e.target.value }))}
                              placeholder="Reason for shortage..."
                            />
                          ) : (
                            <span className="text-xs" style={{ color: MUTED }}>{row.discrepancy_notes || '—'}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 border-b" style={{ borderColor: BORDER }}>
                          <StatusBadge status={
                            isPending
                              ? (isShort ? 'Not Fully Received' : (qtyVal !== '' ? 'Received' : 'In Transit'))
                              : row.status
                          } />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Confirm bar */}
            {viewMode === 'open' && (
              <div className="flex items-center justify-end gap-3 px-5 py-3 border-t flex-shrink-0" style={{ borderColor: BORDER, background: '#fff' }}>
                <span className="text-xs" style={{ color: MUTED }}>
                  {pendingRows.length > 0 ? `Fill all ${pendingRows.length} qty field(s) to finalize` : 'All items already received'}
                </span>
                <button onClick={handleReceive} disabled={saving || !allFilled || done}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                  style={{
                    background: allFilled && !done ? BLUE : '#F1F5F9',
                    color: allFilled && !done ? '#fff' : '#94A3B8',
                    border: `1px solid ${allFilled && !done ? '#1D4ED8' : '#E2E8F0'}`,
                    cursor: !allFilled || done ? 'not-allowed' : 'pointer',
                  }}>
                  {saving
                    ? <><div className="w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />Saving...</>
                    : <><CheckCircle size={14} />Finalize Truck</>
                  }
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Line Modal */}
      {showAddLine && (
        <AddTruckLineModal
          plNumber={selectedPL}
          allRows={allRows}
          onClose={() => setShowAddLine(false)}
          onAdded={() => { setShowAddLine(false); qc.invalidateQueries({ queryKey: ['transfer_log'] }); }}
        />
      )}

      {/* Size Breakdown Modal */}
      {openSizeModal && (
        <SizeBreakdownModal
          breakdown={sizeBreakdownInputs[openSizeModal] || truckRows.find(r => r.id === openSizeModal)?.size_breakdown || []}
          onChange={v => setSizeBreakdownInputs(sb => ({ ...sb, [openSizeModal]: v }))}
          onClose={() => setOpenSizeModal(null)}
          isReceiving
        />
      )}
    </div>
  );
}