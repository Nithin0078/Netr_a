import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Video, ShieldCheck, ShieldAlert, FileText, Check, X, AlertTriangle } from 'lucide-react';

const CitizenDashboard = () => {
  const [stats, setStats] = useState({ total: 0, active: 0, paused: 0, revoked: 0 });
  const [requests, setRequests] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch cameras to build stats
        const camRes = await axios.get('/cameras/');
        const cameras = camRes.data;
        
        let active = 0, paused = 0, revoked = 0;
        cameras.forEach(c => {
          if (c.is_revoked) revoked++;
          else if (c.is_paused) paused++;
          else active++;
        });

        setStats({ total: cameras.length, active, paused, revoked });

        // Fetch access requests
        const reqRes = await axios.get('/cameras/requests/citizen');
        // Sort requests: Pending first, then descending by created_at
        const sortedReqs = reqRes.data.sort((a, b) => {
          if (a.status === 'Pending' && b.status !== 'Pending') return -1;
          if (a.status !== 'Pending' && b.status === 'Pending') return 1;
          return new Date(b.created_at) - new Date(a.created_at);
        });
        setRequests(sortedReqs);

        // Fetch reports
        const repRes = await axios.get('/reports/');
        setRecentReports(repRes.data.slice(0, 5));
        
      } catch (e) {
        console.error("Failed to load dashboard data:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleResolveRequest = async (requestId, isApproved) => {
    try {
      const statusValue = isApproved ? 'Approved' : 'Denied';
      const res = await axios.put(`/cameras/requests/${requestId}`, { status: statusValue });
      
      // Update list state
      setRequests(prev =>
        prev.map(r => r.id === requestId ? { ...r, status: statusValue, approved_at: res.data.approved_at, expires_at: res.data.expires_at } : r)
      );
    } catch (e) {
      alert("Failed to resolve request: " + e.message);
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--accent-cyan)' }}>Synchronizing security feeds...</div>;
  }

  return (
    <div className="grid-cols-12 animate-fade-in">
      
      {/* STATS OVERVIEW PANEL */}
      <div className="col-span-3 card-glass card-glow-cyan" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ background: 'rgba(0, 240, 255, 0.1)', padding: '12px', borderRadius: '12px' }}>
          <Video color="var(--accent-cyan)" size={24} />
        </div>
        <div>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Registered Nodes</span>
          <h2 style={{ fontSize: '28px', marginTop: '4px' }}>{stats.total}</h2>
        </div>
      </div>

      <div className="col-span-3 card-glass" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ background: 'rgba(0, 230, 118, 0.1)', padding: '12px', borderRadius: '12px' }}>
          <ShieldCheck color="var(--accent-emerald)" size={24} />
        </div>
        <div>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Active Sharing</span>
          <h2 style={{ fontSize: '28px', marginTop: '4px' }}>{stats.active}</h2>
        </div>
      </div>

      <div className="col-span-3 card-glass" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ background: 'rgba(255, 23, 68, 0.1)', padding: '12px', borderRadius: '12px' }}>
          <ShieldAlert color="var(--accent-rose)" size={24} />
        </div>
        <div>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Revoked/Offline Nodes</span>
          <h2 style={{ fontSize: '28px', marginTop: '4px' }}>{stats.revoked}</h2>
        </div>
      </div>

      <div className="col-span-3 card-glass" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ background: 'rgba(255, 179, 0, 0.1)', padding: '12px', borderRadius: '12px' }}>
          <FileText color="var(--accent-amber)" size={24} />
        </div>
        <div>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Incident Submissions</span>
          <h2 style={{ fontSize: '28px', marginTop: '4px' }}>{recentReports.length}</h2>
        </div>
      </div>

      {/* POLICE ACCESS REQUEST MODULE */}
      <div className="col-span-8 card-glass" style={{ minHeight: '340px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>Police Camera Access Requests</h3>
        {requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            No access requests submitted by law enforcement yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {requests.map(req => (
              <div
                key={req.id}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '700', fontSize: '15px' }}>{req.requested_by_name}</span>
                    <span className="badge badge-info" style={{ fontSize: '10px' }}>Officer</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                    <strong>Reason:</strong> {req.reason}
                  </p>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                    <span>Requested: {new Date(req.created_at).toLocaleString()}</span>
                    <span>Duration: {req.duration_hours} hours</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {req.status === 'Pending' ? (
                    <>
                      <button
                        onClick={() => handleResolveRequest(req.id, false)}
                        className="btn btn-secondary"
                        style={{ padding: '8px 12px', background: 'rgba(255, 23, 68, 0.1)', color: '#ff1744', border: '1px solid rgba(255, 23, 68, 0.2)' }}
                      >
                        <X size={14} /> Deny
                      </button>
                      <button
                        onClick={() => handleResolveRequest(req.id, true)}
                        className="btn btn-primary"
                        style={{ padding: '8px 16px' }}
                      >
                        <Check size={14} /> Approve
                      </button>
                    </>
                  ) : (
                    <span className={`badge ${req.status === 'Approved' ? 'badge-success' : 'badge-danger'}`} style={{ padding: '8px 16px' }}>
                      {req.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RECENT SUBMISSIONS PANEL */}
      <div className="col-span-4 card-glass">
        <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>Recent Reports</h3>
        {recentReports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            No incident reports logged.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentReports.map(rep => (
              <div
                key={rep.id}
                style={{
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  padding: '12px',
                  borderRadius: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600', fontSize: '14px' }}>{rep.title}</span>
                  <span className={`badge ${rep.ai_status === 'Completed' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '9px' }}>
                    AI: {rep.ai_status}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {rep.description}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  <span>{rep.category}</span>
                  <span>{new Date(rep.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default CitizenDashboard;
