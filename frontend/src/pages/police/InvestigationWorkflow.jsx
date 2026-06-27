import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { FolderKanban, Plus, Briefcase, FileImage, ShieldAlert, CheckSquare } from 'lucide-react';

const InvestigationWorkflow = () => {
  const { user } = useAuth();
  
  const [cases, setCases] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState(null);

  // New Case Form
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [selectedReportIds, setSelectedReportIds] = useState([]);

  // Edit Case Details
  const [caseStatus, setCaseStatus] = useState('Open');
  const [findings, setFindings] = useState('');
  const [assignedInvestigator, setAssignedInvestigator] = useState('');

  // Evidence Form
  const [evidenceName, setEvidenceName] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceType, setEvidenceType] = useState('Image');

  const isSupervisorOrAdmin = ['Supervisor', 'Admin'].includes(user?.role);

  const fetchData = async () => {
    try {
      const caseRes = await axios.get('/investigations/cases');
      setCases(caseRes.data);

      const repRes = await axios.get('/reports/');
      setReports(repRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCase = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/investigations/cases', {
        title,
        description,
        priority,
        linked_report_ids: selectedReportIds
      });

      // Reset
      setTitle('');
      setDescription('');
      setPriority('Medium');
      setSelectedReportIds([]);
      setShowAddForm(false);
      
      fetchData();
    } catch (err) {
      alert("Failed to create case: " + err.message);
    }
  };

  const handleUpdateCase = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.put(`/investigations/cases/${selectedCase.id}`, {
        status: caseStatus,
        findings,
        assigned_to_uid: assignedInvestigator || null
      });
      setSelectedCase(res.data);
      alert("Case file synchronized.");
      fetchData();
    } catch (err) {
      alert("Update failed: " + err.message);
    }
  };

  const handleAddEvidence = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`/investigations/cases/${selectedCase.id}/evidence`, {
        name: evidenceName,
        file_url: evidenceUrl,
        media_type: evidenceType
      });
      
      setSelectedCase(res.data);
      setEvidenceName('');
      setEvidenceUrl('');
      
      fetchData();
    } catch (err) {
      alert("Evidence logging failed: " + err.message);
    }
  };

  const handleCaseSelect = (caseObj) => {
    setSelectedCase(caseObj);
    setCaseStatus(caseObj.status);
    setFindings(caseObj.findings || '');
    setAssignedInvestigator(caseObj.assigned_to_uid || '');
  };

  if (loading) {
    return <div style={{ color: 'var(--accent-cyan)' }}>Synchronizing dossier logs...</div>;
  }

  return (
    <div className="grid-cols-12 animate-fade-in" style={{ gap: '24px' }}>
      
      {/* HEADER CONTROLS */}
      <div className="col-span-12" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px' }}>Crime Investigation Workflow</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Compile cases, link citizen incident reports, register forensic evidence, and log investigator updates.
          </p>
        </div>
        {isSupervisorOrAdmin && (
          <button onClick={() => setShowAddForm(!showAddForm)} className="btn btn-primary">
            <Plus size={16} /> Create Case File
          </button>
        )}
      </div>

      {/* CREATE CASE FORM */}
      {showAddForm && (
        <form onSubmit={handleCreateCase} className="col-span-12 card-glass grid-cols-12 animate-fade-in" style={{ gap: '16px' }}>
          <h3 style={{ gridColumn: 'span 12', fontSize: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
            Initialize Case Profile
          </h3>
          <div className="form-group col-span-8">
            <label className="form-label">Case Title</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="form-input" placeholder="Armed theft at sector 4 metro..." />
          </div>
          <div className="form-group col-span-4">
            <label className="form-label">Case Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="form-input" style={{ background: 'var(--bg-primary)' }}>
              <option value="Low">Low Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="High">High Priority</option>
              <option value="Critical">Critical Priority</option>
            </select>
          </div>
          <div className="form-group col-span-12">
            <label className="form-label">Case Narrative / Description</label>
            <textarea required value={description} onChange={(e) => setDescription(e.target.value)} className="form-input" rows={3} style={{ resize: 'none' }} placeholder="Incident description, suspect information, and preliminary details." />
          </div>
          <div className="form-group col-span-12">
            <label className="form-label">Link Sub-Incident Reports (Select Multiple)</label>
            <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.1)' }}>
              {reports.map(rep => (
                <label key={rep.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={selectedReportIds.includes(rep.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedReportIds([...selectedReportIds, rep.id]);
                      else setSelectedReportIds(selectedReportIds.filter(id => id !== rep.id));
                    }}
                  />
                  <span>[{rep.category}] {rep.title} - By {rep.citizen_name}</span>
                </label>
              ))}
            </div>
          </div>
          <div style={{ gridColumn: 'span 12', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowAddForm(false)} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Open Case File</button>
          </div>
        </form>
      )}

      {/* CASES MATRIX */}
      <div className="col-span-5 card-glass">
        <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Active Dossier Index</h3>
        {cases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            No criminal cases registered.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {cases.map(caseObj => (
              <div
                key={caseObj.id}
                onClick={() => handleCaseSelect(caseObj)}
                style={{
                  background: selectedCase?.id === caseObj.id ? 'rgba(0,240,255,0.06)' : 'rgba(255,255,255,0.01)',
                  border: selectedCase?.id === caseObj.id ? '1px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.04)',
                  padding: '16px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold', fontSize: '13px', color: 'var(--accent-cyan)' }}>
                    {caseObj.case_number}
                  </span>
                  <span className={`badge ${caseObj.priority === 'Critical' ? 'badge-danger' : caseObj.priority === 'High' ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: '9px' }}>
                    {caseObj.priority}
                  </span>
                </div>
                <h4 style={{ fontSize: '15px', marginTop: '6px' }}>{caseObj.title}</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px' }}>
                  <span>Status: {caseObj.status}</span>
                  <span>{new Date(caseObj.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CASE DETAILS & FORENSIC EVIDENCE WORKSHOP */}
      <div className="col-span-7">
        {selectedCase ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Details & Findings edit */}
            <div className="card-glass">
              <h3 style={{ fontSize: '18px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                Case Docket: {selectedCase.case_number}
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>{selectedCase.description}</p>

              <form onSubmit={handleUpdateCase} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Docket Status</label>
                    <select value={caseStatus} onChange={(e) => setCaseStatus(e.target.value)} className="form-input" style={{ background: 'var(--bg-primary)' }}>
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Suspended">Suspended</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Assigned Investigator (ID)</label>
                    <input type="text" value={assignedInvestigator} onChange={(e) => setAssignedInvestigator(e.target.value)} className="form-input" placeholder="Enter Investigator UID" />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Investigative Log & Findings Summary</label>
                  <textarea value={findings} onChange={(e) => setFindings(e.target.value)} className="form-input" rows={4} style={{ resize: 'none' }} placeholder="Log investigation outcomes, suspect details, etc." />
                </div>

                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Sync Docket Logs</button>
              </form>
            </div>

            {/* Evidence items list & attachments form */}
            <div className="card-glass">
              <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Linked Forensic Evidence ({selectedCase.evidence?.length || 0})</h3>
              
              {/* Evidence cards */}
              {selectedCase.evidence?.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                  {selectedCase.evidence.map(ev => (
                    <div key={ev.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '600', fontSize: '13px' }}>{ev.name}</span>
                        <span className="badge badge-info" style={{ fontSize: '8px' }}>{ev.media_type}</span>
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>{ev.description}</p>
                      <a href={ev.file_url} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: '10px', fontSize: '11px', color: 'var(--accent-cyan)', textDecoration: 'none' }}>
                        Open Evidence File
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {/* Attach new evidence */}
              <form onSubmit={handleAddEvidence} style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Log New Forensic Evidence</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                  <input type="text" required value={evidenceName} onChange={(e) => setEvidenceName(e.target.value)} className="form-input" placeholder="Evidence descriptor (e.g. CCTV clip window)" />
                  <select value={evidenceType} onChange={(e) => setEvidenceType(e.target.value)} className="form-input" style={{ background: 'var(--bg-primary)' }}>
                    <option value="Image">Forensic Image</option>
                    <option value="Video">Video File</option>
                  </select>
                </div>
                <input type="text" required value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} className="form-input" placeholder="Evidence file URL (Cloudinary URL / Relative path)" />
                <button type="submit" className="btn btn-secondary" style={{ alignSelf: 'flex-end', padding: '8px 16px', fontSize: '13px' }}>
                  Link Evidence
                </button>
              </form>
            </div>

          </div>
        ) : (
          <div className="card-glass" style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
            Select an active case dossier from the index to display files, assignment configurations, and linked evidence items.
          </div>
        )}
      </div>

    </div>
  );
};

export default InvestigationWorkflow;
