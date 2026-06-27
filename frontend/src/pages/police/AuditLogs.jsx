import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldCheck, ShieldAlert, Activity, CheckCircle, RefreshCw } from 'lucide-react';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verificationResult, setVerificationResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const fetchLogs = async () => {
    try {
      const res = await axios.get('/audit/');
      setLogs(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleVerifyLedger = async () => {
    setVerifying(true);
    setVerificationResult(null);
    try {
      const res = await axios.get('/audit/verify');
      setVerificationResult({
        success: true,
        message: res.data.message
      });
    } catch (err) {
      setVerificationResult({
        success: false,
        message: err.response?.data?.detail || "Cryptographic sequence mismatch. Integrity check failed!"
      });
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--accent-cyan)' }}>Synchronizing immutable ledger...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      
      {/* HEADER SECTION */}
      <div>
        <h2 style={{ fontSize: '20px' }}>Immutable Cryptographic Audit Trail</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
          Real-time record of all system queries, footage downloads, camera approvals, and case modifications.
        </p>
      </div>

      {/* LEDGER INTEGRITY CHECK PANEL */}
      <div className="card-glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(25,32,48,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div>
          <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="var(--accent-cyan)" />
            <span>Cryptographic Ledger Status</span>
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Sequentially chains logs using SHA-256 hashes. Verify chain connections to confirm absolute immutability.
          </p>
        </div>

        <button onClick={handleVerifyLedger} disabled={verifying} className="btn btn-primary" style={{ padding: '10px 20px' }}>
          {verifying ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
          <span>{verifying ? 'Verifying Ledger Block Integrity...' : 'Verify Ledger Integrity'}</span>
        </button>
      </div>

      {/* VERIFICATION REPORT PANEL */}
      {verificationResult && (
        <div className="animate-fade-in" style={{
          background: verificationResult.success ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 23, 68, 0.1)',
          border: verificationResult.success ? '1px solid rgba(0, 230, 118, 0.2)' : '1px solid rgba(255, 23, 68, 0.2)',
          color: verificationResult.success ? '#00e676' : '#ff1744',
          padding: '16px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          {verificationResult.success ? <ShieldCheck size={28} /> : <ShieldAlert size={28} />}
          <div>
            <strong style={{ fontSize: '15px' }}>{verificationResult.success ? 'LEDGER VERIFIED & SECURE' : 'CRITICAL LEDGER COMPROMISE DETECTED'}</strong>
            <p style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '2px' }}>{verificationResult.message}</p>
          </div>
        </div>
      )}

      {/* AUDIT LOG TABLE */}
      <div className="card-glass" style={{ overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>Timestamp</th>
              <th style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>Operator</th>
              <th style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>Action</th>
              <th style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>Details</th>
              <th style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>IP Address</th>
              <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>Block Hash (SHA-256)</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} className="hover-bg-glass">
                <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td style={{ padding: '16px 20px', fontWeight: '500' }}>
                  {log.operator_email}
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <span className={`badge ${
                    log.action.includes('BYPASS') ? 'badge-danger' :
                    log.action.includes('FAILED') ? 'badge-warning' :
                    log.action.includes('STREAM') ? 'badge-info' : 'badge-success'
                  }`} style={{ fontSize: '10px' }}>
                    {log.action}
                  </span>
                </td>
                <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', maxWeight: '300px' }}>
                  {log.details}
                </td>
                <td style={{ padding: '16px 20px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                  {log.ip_address}
                </td>
                <td style={{ padding: '16px 20px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontSize: '12px' }}>
                  {log.entry_hash ? `${log.entry_hash.slice(0, 10)}...` : 'genesis'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default AuditLogs;
