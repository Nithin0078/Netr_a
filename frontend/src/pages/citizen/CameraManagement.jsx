import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PrivacyMaskEditor from '../../components/PrivacyMaskEditor';
import { Video, Plus, EyeOff, ShieldCheck, Play, Pause, Trash2, Edit2 } from 'lucide-react';

const CameraManagement = () => {
  const [cameras, setCameras] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [description, setDescription] = useState('');
  
  // Privacy mask config target
  const [activeMaskCamera, setActiveMaskCamera] = useState(null);

  const fetchCameras = async () => {
    try {
      const res = await axios.get('/cameras/');
      setCameras(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCameras();
  }, []);

  const handleAddCamera = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/cameras/', {
        name,
        stream_url: streamUrl,
        location_lat: parseFloat(lat),
        location_lng: parseFloat(lng),
        description
      });
      
      // Reset form
      setName('');
      setStreamUrl('');
      setLat('');
      setLng('');
      setDescription('');
      setShowAddForm(false);
      
      fetchCameras();
    } catch (err) {
      alert("Registration failed: " + err.message);
    }
  };

  const handleTogglePause = async (camera) => {
    try {
      await axios.put(`/cameras/${camera.id}`, { is_paused: !camera.is_paused });
      fetchCameras();
    } catch (e) {
      alert("Failed to toggle sharing: " + e.message);
    }
  };

  const handleToggleRevoke = async (camera) => {
    try {
      await axios.put(`/cameras/${camera.id}`, { is_revoked: !camera.is_revoked });
      fetchCameras();
    } catch (e) {
      alert("Failed to resolve revocation: " + e.message);
    }
  };

  const handleSaveMasks = async (masks) => {
    try {
      await axios.put(`/cameras/${activeMaskCamera.id}`, { privacy_masks: masks });
      setActiveMaskCamera(null);
      fetchCameras();
    } catch (e) {
      alert("Failed to save masks: " + e.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px' }}>Manage Surveillance Cameras</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Register feeds, adjust masking sectors, pause sharing, or revoke access at any time.
          </p>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)} className="btn btn-primary">
          <Plus size={16} /> Register CCTV Feed
        </button>
      </div>

      {/* REGISTER FORM */}
      {showAddForm && (
        <form onSubmit={handleAddCamera} className="card-glass animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '800px' }}>
          <h3 style={{ gridColumn: 'span 2', fontSize: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
            New Camera Connection Details
          </h3>
          <div className="form-group">
            <label className="form-label">Camera Name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="form-input" placeholder="Front Driveway / Living Gate" />
          </div>
          <div className="form-group">
            <label className="form-label">Stream URL (RTSP / HTTP / HLS)</label>
            <input type="text" required value={streamUrl} onChange={(e) => setStreamUrl(e.target.value)} className="form-input" placeholder="rtsp://192.168.1.100:554/live" />
          </div>
          <div className="form-group">
            <label className="form-label">Latitude</label>
            <input type="number" step="any" required value={lat} onChange={(e) => setLat(e.target.value)} className="form-input" placeholder="28.6139" />
          </div>
          <div className="form-group">
            <label className="form-label">Longitude</label>
            <input type="number" step="any" required value={lng} onChange={(e) => setLng(e.target.value)} className="form-input" placeholder="77.2090" />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Brief Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="form-input" placeholder="Covers the gate and immediate roadside perimeter." rows={2} style={{ resize: 'none' }} />
          </div>
          <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowAddForm(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Connect Feed</button>
          </div>
        </form>
      )}

      {/* PRIVACY MASK INTERACTIVE MODAL */}
      {activeMaskCamera && (
        <div className="card-glass" style={{ border: '1px solid var(--accent-cyan)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px' }}>Configuring Mask: {activeMaskCamera.name}</h3>
            <button onClick={() => setActiveMaskCamera(null)} className="btn btn-secondary" style={{ padding: '4px 12px' }}>Close Editor</button>
          </div>
          <PrivacyMaskEditor
            imageUrl={null} // Falls back to default placeholder or relative stream image
            initialMasks={activeMaskCamera.privacy_masks}
            onSave={handleSaveMasks}
          />
        </div>
      )}

      {/* CAMERA CARDS GRID */}
      <div className="grid-cols-12">
        {cameras.length === 0 ? (
          <div className="col-span-12 card-glass" style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            No CCTV nodes connected to your netra account. Connect a camera feed to start sharing safely.
          </div>
        ) : (
          cameras.map(camera => (
            <div key={camera.id} className="col-span-4 card-glass" style={{ borderLeft: camera.is_revoked ? '4px solid #ff1744' : camera.is_paused ? '4px solid #ffb300' : '4px solid #00e676' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '16px' }}>{camera.name}</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>ID: {camera.id.slice(0, 8)}...</span>
                </div>
                <span className={`badge ${camera.is_revoked ? 'badge-danger' : camera.is_paused ? 'badge-warning' : 'badge-success'}`}>
                  {camera.is_revoked ? 'Revoked' : camera.is_paused ? 'Paused' : 'Sharing'}
                </span>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', minHeight: '36px' }}>
                {camera.description || 'No description provided.'}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                <button
                  onClick={() => handleTogglePause(camera)}
                  disabled={camera.is_revoked}
                  className="btn btn-secondary"
                  style={{ flexGrow: 1, padding: '8px', fontSize: '12px' }}
                >
                  {camera.is_paused ? <Play size={12} /> : <Pause size={12} />}
                  <span>{camera.is_paused ? 'Resume Sharing' : 'Pause Sharing'}</span>
                </button>
                
                <button
                  onClick={() => setActiveMaskCamera(camera)}
                  disabled={camera.is_revoked}
                  className="btn btn-secondary"
                  style={{ flexGrow: 1, padding: '8px', fontSize: '12px' }}
                >
                  <Edit2 size={12} />
                  <span>Mask Zones</span>
                </button>

                <button
                  onClick={() => handleToggleRevoke(camera)}
                  className="btn btn-danger"
                  style={{ width: '100%', padding: '8px', fontSize: '12px', marginTop: '4px' }}
                >
                  <EyeOff size={12} />
                  <span>{camera.is_revoked ? 'Restore Police access' : 'Revoke Police access'}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default CameraManagement;
