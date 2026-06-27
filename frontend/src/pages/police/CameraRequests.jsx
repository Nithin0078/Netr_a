import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Video, ShieldAlert, Check, X, ShieldAlert as Alert } from 'lucide-react';

const CameraRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const res = await axios.get('/cameras/requests/police');
      setRequests(res.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (e) {
      console.error("Failed to load request log:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  if (loading) {
    return <div style={{ color: 'var(--accent-cyan)' }}>Synchronizing request matrices...</div>;
  }

  return (
    <div style={{ maxWidth: '880px' }} className="animate-fade-in">
      <div className="card-glass">
        <h2 style={{ fontSize: '20px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
          My Camera Access Requests
        </h2>

        {requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            No access request logs registered for your account. You can request access from the main Command Center.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {requests.map(req => {
              const expiresDate = req.expires_at ? new Date(req.expires_at) : null;
              const isExpired = expiresDate && expiresDate < new Date();
              
              return (
                <div
                  key={req.id}
                  style={{
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '700', fontSize: '15px' }}>Camera Node: {req.camera_id.slice(0, 8)}...</span>
                      {isExpired ? (
                        <span className="badge badge-danger" style={{ fontSize: '9px' }}>Expired</span>
                      ) : (
                        <span className={`badge ${req.status === 'Approved' ? 'badge-success' : req.status === 'Denied' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '9px' }}>
                          {req.status}
                        </span>
                      )}
                    </div>
                    
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                      <strong>Audit Reason:</strong> {req.reason}
                    </p>
                    
                    <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                      <span>Submitted: {new Date(req.created_at).toLocaleString()}</span>
                      <span>Requested Hours: {req.duration_hours}</span>
                      {req.approved_at && (
                        <span>Approved: {new Date(req.approved_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  {req.status === 'Approved' && !isExpired && (
                    <div style={{ fontSize: '12px', textAlign: 'right', color: 'var(--accent-emerald)' }}>
                      <strong>Active Access</strong>
                      <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Expires: {expiresDate.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraRequests;
