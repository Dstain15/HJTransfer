import { useState, useMemo, Fragment, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Printer, Truck, Search, FileText, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { exportToCSV } from '@/utils/exportToCSV';

const BORDER = '#D8E3F8';
const BLUE = '#2563EB';
const TEXT = '#1E2A4A';
const MUTED = '#6B7BAE';

export default function PackList() {
  const [selectedPL, setSelectedPL] = useState('');
  const [truckSearch, setTruckSearch] = useState('');

  const { data: allRows = [], isLoading } = useQuery({
    queryKey: ['transfer_log'],
    queryFn: () => base44.entities.TransferRequest.list('-date_logged', 500),
  });

  const allTrucks = useMemo(() => {
    const map = {};
    allRows.filter(r => r.pl_number).forEach(r => {
      if (!map[r.pl_number]) map[r.pl_number] = { count: 0, status: r.status };
      map[r.pl_number].count++;
    });
    return Object.entries(map).map(([pl, v]) => ({ pl, ...v })).sort((a, b) => a.pl.localeCompare(b.pl));
  }, [allRows]);

  const trucks = useMemo(() => {
    if (!truckSearch) return allTrucks;
    return allTrucks.filter(t => t.pl.toLowerCase().includes(truckSearch.toLowerCase()));
  }, [allTrucks, truckSearch]);

  const truckRows = selectedPL
    ? allRows.filter(r => r.pl_number && r.pl_number.trim().toUpperCase() === selectedPL.trim().toUpperCase())
    : [];

  const tableRef = useRef(null);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    const element = tableRef.current;
    if (!element) return;

    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        // html2canvas renders badge text shifted down — nudge only the text up in the clone
        clonedDoc.querySelectorAll('.pl-badge-text').forEach(el => {
          el.style.position = 'relative';
          el.style.top = '-8px';
        });
        // Force vertical centering for all table cells in the PDF capture.
        // html2canvas renders text shifted down — compensate by shifting padding up.
        clonedDoc.querySelectorAll('td, th').forEach(el => {
          el.style.verticalAlign = 'middle';
          el.style.paddingTop = '2px';
          el.style.paddingBottom = '14px';
        });
        // The badge bubble doesn't get the same downward text shift — push it back down
        clonedDoc.querySelectorAll('.pl-badge').forEach(el => {
          el.style.position = 'relative';
          el.style.top = '6px';
        });
      },
    });

    const imgData = canvas.toDataURL('image/png');
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'in',
      format: 'letter',
    });

    const imgWidth = 11 - 0.5; // 11 inches minus 0.5 inch margins
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    doc.setFontSize(14);
    doc.text(`Packlist - PL # ${selectedPL}`, 0.5, 0.4);
    doc.setFontSize(10);
    doc.text(`Total Units: ${totalUnits} | Date: ${new Date().toLocaleDateString()}`, 0.5, 0.6);

    doc.addImage(imgData, 'PNG', 0.5, 0.8, imgWidth, imgHeight);
    doc.save(`Packlist_${selectedPL}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExportCSV = () => {
    const columns = [
      { header: 'Request ID', accessor: 'request_id' },
      { header: 'Item Type', accessor: 'item_type' },
      { header: 'Item Code', accessor: 'item_code' },
      { header: 'Qty Requested', accessor: 'qty_requested' },
      { header: 'Qty Sent', accessor: 'qty_sent' },
      { header: 'Qty Received', accessor: 'qty_received' },
    ];
    exportToCSV(truckRows, 'PackList', columns);
  };

  const totalUnits = truckRows.reduce((sum, r) => sum + (r.qty_sent || 0), 0);

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .print-container { 
            box-shadow: none !important; 
            border: none !important;
            margin: 0 !important;
            padding: 20px !important;
            width: 100% !important;
            max-width: none !important;
            background: white !important;
          }
          table { border-spacing: 0 !important; }
          td { wordWrap: 'break-word' !important; }
        }
      `}</style>

      <div className="flex h-full" style={{ background: '#F0F5FF' }}>
        {/* Truck list sidebar - hide on print */}
        <div className="no-print flex flex-col flex-shrink-0 border-r" style={{ width: 220, background: '#fff', borderColor: BORDER }}>
          <div className="px-3 py-3 border-b" style={{ borderColor: BORDER }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: MUTED }}>Trucks</p>
            <div className="relative">
              <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
              <input
                style={{ background: '#fff', border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 6, padding: '6px 10px', fontSize: 12, outline: 'none', paddingLeft: 26, width: '100%' }}
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
              <p className="text-xs text-center py-6" style={{ color: MUTED }}>{truckSearch ? 'No matching trucks' : 'No trucks'}</p>
            )}
            {trucks.map(({ pl, count, status }) => (
              <button key={pl} onClick={() => setSelectedPL(pl)}
                className="w-full flex items-center justify-between px-3 py-2 text-left transition-colors"
                style={{
                  background: selectedPL === pl ? '#EFF6FF' : 'transparent',
                  borderLeft: selectedPL === pl ? `3px solid ${BLUE}` : '3px solid transparent',
                }}>
                <div className="flex items-center gap-2">
                  <Truck size={12} style={{ color: selectedPL === pl ? BLUE : MUTED, flexShrink: 0 }} />
                  <span className="text-xs font-mono font-semibold" style={{ color: selectedPL === pl ? BLUE : TEXT }}>{pl}</span>
                </div>
                <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{
                  background: '#EEF2FF',
                  color: MUTED,
                  border: `1px solid ${BORDER}`,
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
            <div className="flex flex-col items-center justify-center h-full" style={{ color: MUTED }}>
              <FileText size={32} style={{ marginBottom: 12, color: '#BFDBFE' }} />
              <p className="text-sm font-medium">Select a truck to view packlist</p>
            </div>
          ) : (
            <>
              {/* Header - hide on print */}
              <div className="no-print flex items-center justify-between px-5 py-3 border-b flex-shrink-0" style={{ borderColor: BORDER, background: '#fff' }}>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold" style={{ color: TEXT }}>PL # {selectedPL}</span>
                  <span className="text-xs" style={{ color: MUTED }}>{truckRows.length} line item(s)</span>
                  <span className="text-xs" style={{ color: MUTED }}>Total: <strong style={{ color: TEXT }}>{totalUnits}</strong> units</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleExportCSV}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                    style={{ background: '#EEF2FF', color: BLUE, border: `1px solid ${BORDER}` }}>
                    <Download size={14} /> Export CSV
                  </button>
                  <button onClick={handleExportPDF}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                    style={{ background: '#EEF2FF', color: BLUE, border: `1px solid ${BORDER}` }}>
                    <Download size={14} /> Export PDF
                  </button>
                  <button onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                    style={{ background: BLUE, color: '#fff', border: `1px solid #1D4ED8` }}>
                    <Printer size={14} /> Print Packlist
                  </button>
                </div>
              </div>

              {/* Print header - show only on print */}
              <div className="print-only hidden" style={{ padding: 0, marginBottom: 15 }}>
                <h1 style={{ fontSize: 20, fontWeight: 'bold', color: TEXT, marginBottom: 5 }}>Packlist</h1>
                <p style={{ fontSize: 12, color: MUTED }}>PL # {selectedPL}</p>
              </div>

              {/* Table */}
              <div ref={tableRef} className="flex-1 overflow-auto print-container" style={{ background: '#F7F9FF', padding: 20 }}>
                <table className="w-full border-collapse" style={{ background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
                  <thead>
                    <tr style={{ background: '#E8EFFE', borderBottom: `1px solid ${BORDER}` }}>
                      {['Req ID', 'Item Type', 'Item Code', 'Qty Req', 'Qty Sent', 'Qty Received'].map(h => {
                        const isQty = ['Qty Req', 'Qty Sent', 'Qty Received'].includes(h);
                        return (
                          <th key={h} className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider ${isQty ? 'text-center' : 'text-left'}`} style={{ color: MUTED, whiteSpace: 'nowrap' }}>{h}</th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {truckRows.map((row, i) => (
                      <Fragment key={row.id}>
                        {/* Main row */}
                        <tr style={{
                           background: i % 2 === 0 ? '#fff' : '#F7F9FF',
                           borderBottom: `1px solid ${BORDER}`,
                           verticalAlign: 'top',
                         }}>
                           <td className="px-3 py-2 text-xs font-mono" style={{ color: MUTED, fontSize: 10, verticalAlign: 'top' }}>
                             {row.request_id || '—'}
                           </td>
                           <td className="px-3 py-2" style={{ verticalAlign: 'top' }}>
                             <span className="pl-badge text-xs px-1.5 rounded font-medium" style={{ background: '#DBEAFE', color: '#1D4ED8', border: '1px solid #BFDBFE', display: 'inline-block', height: 18, lineHeight: '18px' }}><span className="pl-badge-text">{row.item_type}</span></span>
                           </td>
                           <td className="px-3 py-2" style={{ verticalAlign: 'top' }}>
                             <div className="text-xs font-mono font-semibold" style={{ color: TEXT, fontSize: 11, lineHeight: '18px' }}>{row.item_code}</div>
                           </td>
                           <td className="px-3 py-2 text-xs text-center font-mono font-semibold" style={{ color: TEXT, verticalAlign: 'top' }}>{row.qty_requested || 0}</td>
                           <td className="px-3 py-2 text-xs text-center font-mono font-semibold" style={{ color: TEXT, verticalAlign: 'top' }}>{row.qty_sent || 0}</td>
                           <td className="px-3 py-2 text-xs text-center font-mono font-semibold" style={{ color: TEXT, verticalAlign: 'top' }}>
                             {row.qty_received == null || row.qty_received === 0 ? '' : row.qty_received}
                           </td>
                         </tr>
                        {/* Size breakdown rows for GOWN STOCK */}
                        {row.size_breakdown && row.size_breakdown.length > 0 && (
                          <>
                            {row.size_breakdown.filter(sz => (sz.qty_requested || 0) !== 0 || (sz.qty_sent || 0) !== 0 || (sz.qty_received || 0) !== 0).map((sizeEntry, idx) => (
                              <tr key={`${row.id}-size-${idx}`} style={{
                                background: idx % 2 === 0 ? '#F7F9FF' : '#fff',
                                borderBottom: `1px solid ${BORDER}`,
                              }}>
                                <td className="px-3 py-2 text-xs" style={{ color: MUTED, fontSize: 9 }}>
                                  └─
                                </td>
                                <td className="px-3 py-2" />
                                <td className="px-3 py-2 text-xs font-mono font-semibold" style={{ color: TEXT, fontSize: 11 }}>
                                  └─ {sizeEntry.size}
                                </td>
                                <td className="px-3 py-2 text-xs text-center font-mono" style={{ color: TEXT, fontSize: 10 }}>
                                  {sizeEntry.qty_requested || 0}
                                </td>
                                <td className="px-3 py-2 text-xs text-center font-mono" style={{ color: TEXT, fontSize: 10 }}>
                                  {sizeEntry.qty_sent || 0}
                                </td>
                                <td className="px-3 py-2 text-xs text-center font-mono" style={{ color: TEXT, fontSize: 10 }}>
                                  {sizeEntry.qty_received == null || sizeEntry.qty_received === 0 ? '' : sizeEntry.qty_received}
                                </td>
                              </tr>
                            ))}
                          </>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}