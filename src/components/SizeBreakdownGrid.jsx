import React from 'react';

const SIZES_R = ['40R','42R','44R','46R','48R','50R','52R','54R','56R','58R','60R','62R','64R','66R','68R','70R'];
const SIZES_X = ['40X','42X','44X','46X','48X','50X','52X','54X','56X','58X','60X','62X','64X','66X','68X','70X'];
const SIZES_Z = ['40Z','42Z','44Z','46Z','48Z','50Z','52Z','54Z','56Z','58Z','60Z','62Z','64Z','66Z','68Z','70Z'];

export const ALL_SIZES = [...SIZES_R, ...SIZES_X, ...SIZES_Z];

export function initBreakdown() {
  return ALL_SIZES.map(size => ({ size, qty_requested: 0, qty_sent: null, qty_received: null }));
}

export function rollupBreakdown(breakdown, field) {
  if (!breakdown?.length) return null;
  return breakdown.reduce((sum, s) => sum + (Number(s[field]) || 0), 0);
}

const BORDER = '#D8E3F8';
const BLUE = '#2563EB';
const TEXT = '#1E2A4A';
const MUTED = '#6B7BAE';

const COL_COLORS = {
  R: { bg: '#EEF2FF', text: '#3B5BDB', header: '#DBEAFE' },
  X: { bg: '#F5F3FF', text: '#6D4DC6', header: '#EDE9FE' },
  Z: { bg: '#EFF6FF', text: '#1D6FAE', header: '#DBEAFE' },
};

export default function SizeBreakdownGrid({ breakdown = [], onChange, readOnly = false, showSent = false, showReceived = false }) {
  const getQty = (size, field) => {
    const entry = breakdown.find(b => b.size === size);
    const v = entry?.[field];
    return (v === null || v === undefined || v === 0) ? '' : String(v);
  };

  const setQty = (size, field, raw) => {
    const cleaned = raw.replace(/\D/g, '').slice(0, 3);
    const val = cleaned === '' ? 0 : Number(cleaned);
    const updated = breakdown.map(b => b.size === size ? { ...b, [field]: val } : b);
    onChange(updated);
  };

  const totalR = SIZES_R.reduce((s, sz) => s + (Number(breakdown.find(b=>b.size===sz)?.qty_requested)||0), 0);
  const totalX = SIZES_X.reduce((s, sz) => s + (Number(breakdown.find(b=>b.size===sz)?.qty_requested)||0), 0);
  const totalZ = SIZES_Z.reduce((s, sz) => s + (Number(breakdown.find(b=>b.size===sz)?.qty_requested)||0), 0);

  const totalSentR = SIZES_R.reduce((s, sz) => s + (Number(breakdown.find(b=>b.size===sz)?.qty_sent)||0), 0);
  const totalSentX = SIZES_X.reduce((s, sz) => s + (Number(breakdown.find(b=>b.size===sz)?.qty_sent)||0), 0);
  const totalSentZ = SIZES_Z.reduce((s, sz) => s + (Number(breakdown.find(b=>b.size===sz)?.qty_sent)||0), 0);

  const totalRcvdR = SIZES_R.reduce((s, sz) => s + (Number(breakdown.find(b=>b.size===sz)?.qty_received)||0), 0);
  const totalRcvdX = SIZES_X.reduce((s, sz) => s + (Number(breakdown.find(b=>b.size===sz)?.qty_received)||0), 0);
  const totalRcvdZ = SIZES_Z.reduce((s, sz) => s + (Number(breakdown.find(b=>b.size===sz)?.qty_received)||0), 0);

  const reqCell = (size, colKey) => {
    const val = getQty(size, 'qty_requested');
    if (readOnly) {
      return <span className="text-xs font-mono" style={{ color: val ? TEXT : '#ccc' }}>{val || '—'}</span>;
    }
    const isActive = val !== '';
    return (
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        style={{
          background: isActive ? COL_COLORS[colKey].bg : '#F7F9FF',
          border: `1px solid ${isActive ? COL_COLORS[colKey].header : BORDER}`,
          color: isActive ? COL_COLORS[colKey].text : TEXT,
          borderRadius: 4,
          padding: '5px 3px',
          fontSize: 12,
          width: 48,
          height: 28,
          textAlign: 'center',
          outline: 'none',
          fontWeight: 600,
          WebkitAppearance: 'none',
          MozAppearance: 'textfield',
          cursor: 'text',
        }}
        value={val}
        onChange={e => setQty(size, 'qty_requested', e.target.value)}
        placeholder="0"
        autoComplete="off"
      />
    );
  };

  const sentCell = (size, colKey) => {
    const val = getQty(size, 'qty_sent');
    const isActive = val !== '';
    return (
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        style={{
          background: isActive ? '#FFF7ED' : '#F7F9FF',
          border: `1px solid ${isActive ? '#FDE68A' : BORDER}`,
          color: isActive ? '#B45309' : TEXT,
          borderRadius: 4,
          padding: '5px 3px',
          fontSize: 12,
          width: 48,
          height: 28,
          textAlign: 'center',
          outline: 'none',
          fontWeight: 600,
          WebkitAppearance: 'none',
          MozAppearance: 'textfield',
          cursor: 'text',
        }}
        value={val}
        onChange={e => setQty(size, 'qty_sent', e.target.value)}
        placeholder="0"
        autoComplete="off"
      />
    );
  };

  const sentCellReadOnly = (size) => {
    const val = getQty(size, 'qty_sent');
    return <span className="text-xs font-mono font-semibold" style={{ color: val ? '#B45309' : MUTED }}>{val || '—'}</span>;
  };

  const receivedCell = (size, colKey) => {
    const val = getQty(size, 'qty_received');
    const isActive = val !== '';
    const sent = Number(breakdown.find(b => b.size === size)?.qty_sent) || 0;
    const isOverReceived = isActive && sent > 0 && Number(val) > sent * 1.1;
    return (
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        style={{
          background: isOverReceived ? '#FEF2F2' : isActive ? '#F0FDF4' : '#F7F9FF',
          border: `1px solid ${isOverReceived ? '#FCA5A5' : isActive ? '#86EFAC' : BORDER}`,
          color: isOverReceived ? '#DC2626' : isActive ? '#15803D' : TEXT,
          borderRadius: 4,
          padding: '5px 3px',
          fontSize: 12,
          width: 48,
          height: 28,
          textAlign: 'center',
          outline: 'none',
          fontWeight: 600,
          WebkitAppearance: 'none',
          MozAppearance: 'textfield',
          cursor: 'text',
        }}
        value={val}
        onChange={e => setQty(size, 'qty_received', e.target.value)}
        placeholder="0"
        autoComplete="off"
      />
    );
  };

  const colDefs = [
    { k: 'R', label: 'R' },
    { k: 'X', label: 'X' },
    { k: 'Z', label: 'Z' },
  ];

  return (
    <div className="rounded" style={{ border: `1px solid ${BORDER}` }}>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th className="text-left text-xs font-semibold px-2 py-1"
              style={{ background: '#EEF2FF', color: MUTED, minWidth: 32, borderBottom: `1px solid ${BORDER}` }}>Sz</th>
            {showReceived ? (
              colDefs.map(({ k, label }) => (
                <th key={k} colSpan={2} className="text-center text-xs font-semibold px-1 py-1"
                  style={{ background: COL_COLORS[k].header, color: COL_COLORS[k].text, borderBottom: `1px solid ${BORDER}`, borderLeft: `1px solid ${BORDER}` }}>
                  {label}
                </th>
              ))
            ) : showSent ? (
              colDefs.map(({ k, label }) => (
                <th key={k} colSpan={2} className="text-center text-xs font-semibold px-1 py-1"
                  style={{ background: COL_COLORS[k].header, color: COL_COLORS[k].text, borderBottom: `1px solid ${BORDER}`, borderLeft: `1px solid ${BORDER}` }}>
                  {label}
                </th>
              ))
            ) : (
              colDefs.map(({ k, label }) => (
                <th key={k} className="text-center text-xs font-semibold px-1 py-1"
                  style={{ background: COL_COLORS[k].header, color: COL_COLORS[k].text, minWidth: 52, borderBottom: `1px solid ${BORDER}` }}>
                  {label} (Req)
                </th>
              ))
            )}
          </tr>
          {(showSent || showReceived) && (
            <tr>
              <td style={{ background: '#EEF2FF', borderBottom: `1px solid ${BORDER}` }} />
              {colDefs.map(({ k }) => (
                <React.Fragment key={k}>
                  {showReceived ? (
                    <>
                      <td key={`${k}-sent`} className="text-center" style={{ background: '#FFF7ED', borderBottom: `1px solid ${BORDER}`, borderLeft: `1px solid ${BORDER}`, fontSize: 9, color: '#B45309', fontWeight: 600, padding: '1px 2px' }}>Sent</td>
                      <td key={`${k}-rcvd`} className="text-center" style={{ background: '#F0FDF4', borderBottom: `1px solid ${BORDER}`, fontSize: 9, color: '#15803D', fontWeight: 600, padding: '1px 2px' }}>Rcvd</td>
                    </>
                  ) : (
                    <>
                      <td key={`${k}-req`} className="text-center" style={{ background: COL_COLORS[k].header, borderBottom: `1px solid ${BORDER}`, borderLeft: `1px solid ${BORDER}`, fontSize: 9, color: COL_COLORS[k].text, fontWeight: 600, padding: '1px 2px' }}>Req</td>
                      <td key={`${k}-sent`} className="text-center" style={{ background: '#FFF7ED', borderBottom: `1px solid ${BORDER}`, fontSize: 9, color: '#B45309', fontWeight: 600, padding: '1px 2px' }}>Sent</td>
                    </>
                  )}
                </React.Fragment>
              ))}
            </tr>
          )}
        </thead>
        <tbody>
          {SIZES_R.map((_, idx) => {
            const r = SIZES_R[idx], x = SIZES_X[idx], z = SIZES_Z[idx];
            const num = parseInt(r);
            const rowBg = idx % 2 === 0 ? '#fff' : '#F7F9FF';
            return (
              <tr key={num} style={{ background: rowBg }}>
                <td className="px-2 py-0.5 text-xs font-semibold text-center"
                  style={{ color: MUTED, borderBottom: `1px solid ${BORDER}`, fontSize: 10 }}>{num}</td>
                {showReceived ? (
                  <>
                    <td className="px-1 py-0.5 text-center" style={{ borderBottom: `1px solid ${BORDER}`, borderLeft: `1px solid ${BORDER}` }}>{sentCellReadOnly(r)}</td>
                    <td className="px-1 py-0.5 text-center" style={{ borderBottom: `1px solid ${BORDER}` }}>{receivedCell(r,'R')}</td>
                    <td className="px-1 py-0.5 text-center" style={{ borderBottom: `1px solid ${BORDER}`, borderLeft: `1px solid ${BORDER}` }}>{sentCellReadOnly(x)}</td>
                    <td className="px-1 py-0.5 text-center" style={{ borderBottom: `1px solid ${BORDER}` }}>{receivedCell(x,'X')}</td>
                    <td className="px-1 py-0.5 text-center" style={{ borderBottom: `1px solid ${BORDER}`, borderLeft: `1px solid ${BORDER}` }}>{sentCellReadOnly(z)}</td>
                    <td className="px-1 py-0.5 text-center" style={{ borderBottom: `1px solid ${BORDER}` }}>{receivedCell(z,'Z')}</td>
                  </>
                ) : showSent ? (
                  <>
                    <td className="px-1 py-0.5 text-center" style={{ borderBottom: `1px solid ${BORDER}`, borderLeft: `1px solid ${BORDER}` }}>{reqCell(r,'R')}</td>
                    <td className="px-1 py-0.5 text-center" style={{ borderBottom: `1px solid ${BORDER}` }}>{sentCell(r,'R')}</td>
                    <td className="px-1 py-0.5 text-center" style={{ borderBottom: `1px solid ${BORDER}`, borderLeft: `1px solid ${BORDER}` }}>{reqCell(x,'X')}</td>
                    <td className="px-1 py-0.5 text-center" style={{ borderBottom: `1px solid ${BORDER}` }}>{sentCell(x,'X')}</td>
                    <td className="px-1 py-0.5 text-center" style={{ borderBottom: `1px solid ${BORDER}`, borderLeft: `1px solid ${BORDER}` }}>{reqCell(z,'Z')}</td>
                    <td className="px-1 py-0.5 text-center" style={{ borderBottom: `1px solid ${BORDER}` }}>{sentCell(z,'Z')}</td>
                  </>
                ) : (
                  <>
                    <td className="px-1 py-0.5 text-center" style={{ borderBottom: `1px solid ${BORDER}` }}>{reqCell(r,'R')}</td>
                    <td className="px-1 py-0.5 text-center" style={{ borderBottom: `1px solid ${BORDER}` }}>{reqCell(x,'X')}</td>
                    <td className="px-1 py-0.5 text-center" style={{ borderBottom: `1px solid ${BORDER}` }}>{reqCell(z,'Z')}</td>
                  </>
                )}
              </tr>
            );
          })}
          <tr style={{ background: '#EEF2FF', borderTop: `2px solid ${BORDER}` }}>
            <td className="px-2 py-1 text-xs font-bold" style={{ color: MUTED }}>Tot</td>
            {showReceived ? (
              <>
                {[{st:totalSentR,rcvd:totalRcvdR,k:'R'},{st:totalSentX,rcvd:totalRcvdX,k:'X'},{st:totalSentZ,rcvd:totalRcvdZ,k:'Z'}].map(({st,rcvd,k}) => (
                  <React.Fragment key={k}>
                    <td className="text-center py-1" style={{ borderLeft: `1px solid ${BORDER}` }}>
                      <span className="text-xs font-bold font-mono" style={{ color: st ? '#B45309' : '#ccc' }}>{st || '—'}</span>
                    </td>
                    <td className="text-center py-1">
                      <span className="text-xs font-bold font-mono" style={{ color: rcvd ? '#15803D' : '#ccc' }}>{rcvd || '—'}</span>
                    </td>
                  </React.Fragment>
                ))}
              </>
            ) : showSent ? (
              <>
                {[{t:totalR,st:totalSentR,k:'R'},{t:totalX,st:totalSentX,k:'X'},{t:totalZ,st:totalSentZ,k:'Z'}].map(({t,st,k}) => (
                  <React.Fragment key={k}>
                    <td className="text-center py-1" style={{ borderLeft: `1px solid ${BORDER}` }}>
                      <span className="text-xs font-bold font-mono" style={{ color: t ? COL_COLORS[k].text : '#ccc' }}>{t || '—'}</span>
                    </td>
                    <td className="text-center py-1">
                      <span className="text-xs font-bold font-mono" style={{ color: st ? '#B45309' : '#ccc' }}>{st || '—'}</span>
                    </td>
                  </React.Fragment>
                ))}
              </>
            ) : (
              [{t:totalR,k:'R'},{t:totalX,k:'X'},{t:totalZ,k:'Z'}].map(({t,k}) => (
                <td key={k} className="text-center py-1">
                  <span className="text-xs font-bold font-mono" style={{ color: t ? COL_COLORS[k].text : '#ccc' }}>{t || '—'}</span>
                </td>
              ))
            )}
          </tr>
        </tbody>
      </table>
    </div>
  );
}