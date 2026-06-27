import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import {
  Video, Eye, AlertTriangle, ShieldCheck, Clipboard, FileText,
  Activity, Radio, Compass, Lock, Unlock, HelpCircle, X
} from 'lucide-react';

const PoliceDashboard = () => {
  const { user } = useAuth();
  
  // App metrics
  const [metrics, setMetrics] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal / Access Request states
  const [requestCamera, setRequestCamera] = useState(null);
  const [requestReason, setRequestReason] = useState('');
  const [requestDuration, setRequestDuration] = useState('24');
  
  // Streaming Player HUD
  const [streamCamera, setStreamCamera] = useState(null);
  const [streamUrl, setStreamUrl] = useState('');
  const [streamAlerts, setStreamAlerts] = useState([]);
  const [streamDetections, setStreamDetections] = useState([]);
  const [streamBypass, setStreamBypass] = useState(false);
  const [streamError, setStreamError] = useState('');

  const fetchDashboardData = async () => {
    try {
      const metricRes = await axios.get('/analytics/');
      setMetrics(metricRes.data);

      const camRes = await axios.get('/cameras/');
      setCameras(camRes.data);

      const repRes = await axios.get('/reports/');
      setReports(repRes.data);
    } catch (e) {
      console.error("Dashboard synchronization failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRequestAccess = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/cameras/requests', {
        camera_id: requestCamera.id,
        reason: requestReason,
        duration_hours: parseInt(requestDuration)
      });
      alert("Access request successfully submitted to the citizen node.");
      setRequestCamera(null);
      setRequestReason('');
      fetchDashboardData();
    } catch (err) {
      alert("Request failed: " + err.response?.data?.detail);
    }
  };

  const handleStreamClick = async (camera) => {
    setStreamError('');
    setStreamCamera(camera);
    
    try {
      const res = await axios.get(`/cameras/${camera.id}/stream`);
      setStreamUrl(res.data.stream_url);
      setStreamBypass(res.data.bypass_triggered);
      
      // Simulate live AI detections on HUD player
      setStreamDetections([
        { type: 'Car', box: [100, 120, 260, 240] },
        { type: 'Person', box: [320, 80, 410, 280] },
        { type: 'License Plate (ANPR)', box: [180, 200, 220, 220] }
      ]);
      setStreamAlerts([
        { type: 'Vehicle Tracking', message: 'Hatchback identified moving at 42km/h.', severity: 'Low' },
        { type: 'ANPR Alert', message: 'License Plate parsed: DL-3C-AS-4921.', severity: 'Medium' }
      ]);

    } catch (err) {
      setStreamError(err.response?.data?.detail || "Could not retrieve camera stream. Access is restricted.");
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--accent-cyan)' }}>Booting Command Grid...</div>;
  }

  return (
    <div className="grid-cols-12 animate-fade-in" style={{ gap: '20px' }}>
      
      {/* METRICS HEADER CARDS */}
      <div className="col-span-3 card-glass card-glow-cyan" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ background: 'rgba(0, 240, 255, 0.1)', padding: '12px', borderRadius: '12px' }}>
          <Video color="var(--accent-cyan)" size={24} />
        </div>
        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Surveillance Nodes Online</span>
          <h2 style={{ fontSize: '24px', marginTop: '4px' }}>{metrics?.active_cameras} / {metrics?.total_cameras}</h2>
        </div>
      </div>

      <div className="col-span-3 card-glass" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ background: 'rgba(255, 23, 68, 0.1)', padding: '12px', borderRadius: '12px' }}>
          <AlertTriangle color="var(--accent-rose)" size={24} />
        </div>
        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>AI Anomalies Logged</span>
          <h2 style={{ fontSize: '24px', marginTop: '4px' }}>{metrics?.ai_alerts_count}</h2>
        </div>
      </div>

      <div className="col-span-3 card-glass" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ background: 'rgba(255, 179, 0, 0.1)', padding: '12px', borderRadius: '12px' }}>
          <FileText color="var(--accent-amber)" size={24} />
        </div>
        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Pending Crime Reports</span>
          <h2 style={{ fontSize: '24px', marginTop: '4px' }}>{metrics?.crime_reports}</h2>
        </div>
      </div>

      <div className="col-span-3 card-glass" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ background: 'rgba(0, 230, 118, 0.1)', padding: '12px', borderRadius: '12px' }}>
          <ShieldCheck color="var(--accent-emerald)" size={24} />
        </div>
        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Active Case Files</span>
          <h2 style={{ fontSize: '24px', marginTop: '4px' }}>{metrics?.ongoing_investigations}</h2>
        </div>
      </div>

      {/* ACCESS REQUEST POPUP */}
      {requestCamera && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
        }}>
          <form onSubmit={handleRequestAccess} className="card-glass animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '32px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Request Camera Access</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
              Submit authorization request to citizen node: <strong>{requestCamera.name}</strong>.
            </p>

            <div className="form-group">
              <label className="form-label">Tactical Reason for Access</label>
              <textarea
                required
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                className="form-input"
                placeholder="e.g. Investigation of robbery on Sector 4 road, matching timeframe 2:00 PM."
                rows={3}
                style={{ resize: 'none' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Requested Duration</label>
              <select
                value={requestDuration}
                onChange={(e) => setRequestDuration(e.target.value)}
                className="form-input"
                style={{ background: 'var(--bg-primary)' }}
              >
                <option value="6">6 Hours</option>
                <option value="12">12 Hours</option>
                <option value="24">24 Hours</option>
                <option value="72">3 Days (72 Hrs)</option>
                <option value="168">7 Days (168 Hrs)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button type="button" onClick={() => setRequestCamera(null)} className="btn btn-secondary">Cancel</button>
              <button type="submit" className="btn btn-primary">Submit Request</button>
            </div>
          </form>
        </div>
      )}

      {/* STREAMING HUD VIEWER PANEL */}
      {streamCamera && (
        <div className="col-span-12 card-glass" style={{ border: '1px solid var(--accent-cyan)', background: '#080a0e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Radio color="var(--accent-rose)" className="animate-pulse" />
              <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>TACTICAL STREAM HUD: {streamCamera.name}</span>
                <span className="badge badge-info" style={{ fontSize: '9px' }}>Live Feed</span>
              </h3>
            </div>
            <button onClick={() => { setStreamCamera(null); setStreamUrl(''); }} className="btn btn-secondary" style={{ padding: '4px 12px' }}>
              <X size={14} /> Close Monitor
            </button>
          </div>

          {streamError ? (
            <div style={{
              background: 'rgba(255, 23, 68, 0.05)',
              border: '1px dashed rgba(255, 23, 68, 0.2)',
              color: '#ff1744',
              padding: '60px 20px',
              textAlign: 'center',
              borderRadius: '8px'
            }}>
              <Lock size={32} style={{ marginBottom: '12px' }} />
              <h4 style={{ fontSize: '16px', fontWeight: 'bold' }}>ACCESS RESTRICTED</h4>
              <p style={{ fontSize: '13px', marginTop: '6px', maxWidth: '400px', margin: '6px auto' }}>
                {streamError}
              </p>
              <button onClick={() => setRequestCamera(streamCamera)} className="btn btn-primary" style={{ marginTop: '16px', padding: '8px 16px', fontSize: '12px' }}>
                Submit Access Request
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '24px' }}>
              {/* Player mockup */}
              <div style={{
                position: 'relative', width: '560px', height: '320px',
                borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: '#000'
              }}>
                <img
                  src="https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=640&q=80"
                  alt="Live Camera Snapshot"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
                />
                
                {/* Visual Bounding boxes */}
                {streamDetections.map((det, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'absolute',
                      left: `${det.box[0]}px`,
                      top: `${det.box[1]}px`,
                      width: `${det.box[2] - det.box[0]}px`,
                      height: `${det.box[3] - det.box[1]}px`,
                      border: det.type.includes('ANPR') ? '2px solid #ffb300' : det.type === 'Person' ? '2px solid #00e676' : '2px solid #0066ff',
                      boxShadow: '0 0 8px rgba(0,0,0,0.5)'
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: '-18px', left: 0,
                      background: det.type.includes('ANPR') ? '#ffb300' : det.type === 'Person' ? '#00e676' : '#0066ff',
                      color: 'black', fontSize: '9px', fontWeight: 'bold', padding: '0 4px', borderRadius: '2px'
                    }}>
                      {det.type}
                    </span>
                  </div>
                ))}

                {/* Cyber HUD indicators */}
                <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(0,0,0,0.7)', padding: '6px 12px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                  FPS: 30 | LATENCY: 12ms | POLYS: {streamCamera.privacy_masks?.length || 0}
                </div>
                
                {streamBypass && (
                  <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(255,23,68,0.85)', padding: '6px 12px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.1em' }}>
                    SUPERVISOR BYPASS ACTIVE
                  </div>
                )}
              </div>

              {/* Feed logs */}
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '14px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px', color: 'var(--text-secondary)' }}>
                  Real-time YOLOv8 Inference Feed
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                  {streamAlerts.map((alert, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', borderLeft: alert.severity === 'High' ? '3px solid #ff1744' : '3px solid #ffb300', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                        <span>{alert.type}</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>JUST NOW</span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>{alert.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CAMERA GRID LIST */}
      <div className="col-span-8 card-glass">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px' }}>Tactical Surveillance Matrix</h3>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Nodes: {cameras.length}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {cameras.map(cam => (
            <div
              key={cam.id}
              style={{
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid rgba(255,255,255,0.04)',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <span style={{ fontWeight: '700', fontSize: '15px' }}>{cam.name}</span>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{cam.description || 'No description provided.'}</p>
                <div style={{ display: 'flex', gap: '12px', fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  <span>Lat: {cam.location_lat} | Lng: {cam.location_lng}</span>
                  <span>Privacy Blurs: {cam.privacy_masks?.length || 0}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setRequestCamera(cam)} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '12px' }}>
                  Request Access
                </button>
                <button onClick={() => handleStreamClick(cam)} className="btn btn-primary" style={{ padding: '8px 12px', fontSize: '12px' }}>
                  <Eye size={14} /> Monitor Feed
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* INCIDENT REVIEWS PANEL */}
      <div className="col-span-4 card-glass">
        <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>Recent Crime Reports</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
          {reports.map(rep => (
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
                <span style={{ fontWeight: '600', fontSize: '13px' }}>{rep.title}</span>
                <span className={`badge ${rep.ai_status === 'Completed' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '9px' }}>
                  AI: {rep.ai_status}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Reported by citizen: <strong>{rep.citizen_name}</strong>
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px' }}>
                <span>{rep.category}</span>
                <span>{new Date(rep.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default PoliceDashboard;
