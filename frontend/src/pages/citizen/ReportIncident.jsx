import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FileText, Upload, ShieldAlert, CheckCircle2 } from 'lucide-react';

const ReportIncident = () => {
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Theft');
  const [location, setLocation] = useState('');
  const [datetime, setDatetime] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setVideoFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      // Build FormData payload
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('location', location);
      formData.append('incident_datetime', datetime);
      
      if (videoFile) {
        formData.append('video', videoFile);
      }

      await axios.post('/reports/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/citizen/dashboard');
      }, 3000);

    } catch (err) {
      setError(err.response?.data?.detail || "Submission failed. Verify connection.");
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '680px' }} className="animate-fade-in">
      <div className="card-glass">
        
        {success ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ display: 'inline-block', background: 'rgba(0, 230, 118, 0.1)', padding: '20px', borderRadius: '50%', marginBottom: '20px' }}>
              <CheckCircle2 size={48} color="var(--accent-emerald)" />
            </div>
            <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Crime Report Logged</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
              Your report has been successfully recorded in the Netra secure public safety index. YOLOv8 vision analytics have been scheduled to analyze the video crop.
            </p>
            <span style={{ fontSize: '12px', color: 'var(--accent-cyan)' }}>Routing back to Dashboard...</span>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
              <div style={{ background: 'rgba(0, 240, 255, 0.1)', padding: '10px', borderRadius: '8px' }}>
                <FileText color="var(--accent-cyan)" size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '20px' }}>Submit Crime/Incident Report</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
                  Provide incident metadata. Upload security footage to run AI automated detection.
                </p>
              </div>
            </div>

            {error && (
              <div style={{
                background: 'rgba(255, 23, 68, 0.1)',
                border: '1px solid rgba(255, 23, 68, 0.2)',
                color: '#ff1744',
                padding: '12px',
                borderRadius: '6px',
                fontSize: '13px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <ShieldAlert size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div className="form-group">
                <label className="form-label">Incident Title / Activity Name</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="form-input"
                  placeholder="Suspicious loitering near back fence / Vehicle break-in attempt"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Incident Classification Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="form-input"
                    style={{ background: 'var(--bg-primary)' }}
                  >
                    <option value="Theft">Theft / Larceny</option>
                    <option value="Assault">Assault / Altercation</option>
                    <option value="Accident">Roadway Accident</option>
                    <option value="Loitering">Loitering Activity</option>
                    <option value="Vandalism">Vandalism / Damage</option>
                    <option value="Other">Other Suspicious Activity</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Incident Timestamp</label>
                  <input
                    type="datetime-local"
                    required
                    value={datetime}
                    onChange={(e) => setDatetime(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Location (Address / Coordinates)</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="form-input"
                  placeholder="e.g. 14 Sector Green, Near Central Metro Station"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Incident Details & Observations</label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-input"
                  placeholder="Detail the events, descriptions of suspects, vehicles, license plates, or distinct items noticed."
                  rows={4}
                  style={{ resize: 'none' }}
                />
              </div>

              {/* VIDEO FILE UPLOADER */}
              <div className="form-group">
                <label className="form-label">Attach CCTV Surveillance Clip (Optional)</label>
                <div style={{
                  border: '2px dashed rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  padding: '20px',
                  textAlign: 'center',
                  background: 'rgba(0,0,0,0.1)',
                  position: 'relative',
                  cursor: 'pointer'
                }}>
                  <Upload size={32} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {videoFile ? `Selected: ${videoFile.name}` : 'Drag & drop MP4 surveillance files, or click to upload.'}
                  </p>
                  <input
                    type="file"
                    accept="video/*,image/*"
                    onChange={handleFileChange}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'UPLOADING SURVEILLANCE & LOGGING...' : 'SUBMIT SECURITY INCIDENT'}
                </button>
              </div>

            </form>
          </>
        )}

      </div>
    </div>
  );
};

export default ReportIncident;
