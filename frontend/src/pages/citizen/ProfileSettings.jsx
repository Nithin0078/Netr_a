import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { User, ShieldCheck, ShieldAlert, KeyRound, Check } from 'lucide-react';

const ProfileSettings = () => {
  const { user, setUser } = useAuth();
  
  // Profile edit fields
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone_number || '');
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // MFA states
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaQrUri, setMfaQrUri] = useState('');
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaSuccess, setMfaSuccess] = useState(false);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setUpdateSuccess(false);
    
    try {
      const res = await axios.put('/users/me', {
        full_name: fullName,
        phone_number: phone
      });
      setUser(res.data);
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (err) {
      alert("Failed to update profile: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleInitMfa = async () => {
    setMfaError('');
    try {
      const res = await axios.post('/users/mfa/setup');
      setMfaSecret(res.data.mfa_secret);
      setMfaQrUri(res.data.mfa_qr_uri);
      setShowMfaSetup(true);
    } catch (e) {
      alert("MFA setup failed: " + e.message);
    }
  };

  const handleConfirmMfa = async (e) => {
    e.preventDefault();
    setMfaError('');
    try {
      await axios.post('/users/mfa/enable', { token: mfaCode });
      setMfaSuccess(true);
      
      // Update local user state
      setUser(prev => ({ ...prev, mfa_enabled: true }));
      
      setTimeout(() => {
        setShowMfaSetup(false);
        setMfaSuccess(false);
      }, 3000);
      
    } catch (err) {
      setMfaError(err.response?.data?.detail || "Invalid code verification.");
    }
  };

  return (
    <div className="grid-cols-12 animate-fade-in">
      
      {/* PROFILE DETAILS CARD */}
      <form onSubmit={handleUpdateProfile} className="col-span-6 card-glass">
        <h3 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={18} color="var(--accent-cyan)" />
          <span>Profile Configuration</span>
        </h3>

        {updateSuccess && (
          <div style={{
            background: 'rgba(0, 230, 118, 0.1)',
            border: '1px solid rgba(0, 230, 118, 0.2)',
            color: '#00e676',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            Profile details updated successfully!
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Email Node address (Immutable)</label>
          <input type="email" disabled value={user?.email} className="form-input" style={{ opacity: 0.6 }} />
        </div>

        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="form-input" />
        </div>

        <div className="form-group">
          <label className="form-label">Contact Phone</label>
          <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="form-input" />
        </div>

        <button type="submit" disabled={updating} className="btn btn-primary" style={{ marginTop: '10px' }}>
          {updating ? 'SAVING CHANGES...' : 'SAVE PROFILE'}
        </button>
      </form>

      {/* SECURITY CONTROLS CARD */}
      <div className="col-span-6 card-glass">
        <h3 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <KeyRound size={18} color="#ffb300" />
          <span>Advanced Security Guardrails</span>
        </h3>

        {user?.mfa_enabled ? (
          <div style={{
            background: 'rgba(0, 230, 118, 0.1)',
            border: '1px solid rgba(0, 230, 118, 0.2)',
            color: '#00e676',
            padding: '20px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <ShieldCheck size={36} style={{ marginBottom: '8px' }} />
            <h4 style={{ fontSize: '15px', fontWeight: 'bold' }}>Multi-Factor Authentication (MFA) Active</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Your account is locked under secondary TOTP validation. Every sign-in request must be verified with an authenticator token.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              background: 'rgba(255, 179, 0, 0.05)',
              border: '1px solid rgba(255, 179, 0, 0.15)',
              padding: '16px',
              borderRadius: '8px',
              color: '#ffb300',
              fontSize: '13px'
            }}>
              <strong>Security Recommendation:</strong> Enable Multi-Factor Authentication to shield your CCTV sharing nodes from unauthorized access.
            </div>

            {!showMfaSetup ? (
              <button onClick={handleInitMfa} className="btn btn-secondary">
                Setup Multi-Factor Authentication
              </button>
            ) : (
              <form onSubmit={handleConfirmMfa} style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Scan Key in Authenticator</h4>
                
                {mfaError && (
                  <div style={{ background: 'rgba(255, 23, 68, 0.1)', color: '#ff1744', padding: '8px', borderRadius: '4px', fontSize: '12px', marginBottom: '12px' }}>
                    {mfaError}
                  </div>
                )}
                
                {mfaSuccess && (
                  <div style={{ background: 'rgba(0, 230, 118, 0.1)', color: '#00e676', padding: '8px', borderRadius: '4px', fontSize: '12px', marginBottom: '12px' }}>
                    MFA activated successfully!
                  </div>
                )}

                <div style={{ background: '#000', padding: '12px', borderRadius: '6px', fontSize: '12px', fontFamily: 'var(--font-mono)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '12px', wordBreak: 'break-all' }}>
                  <strong>Manual Code:</strong> {mfaSecret}
                </div>

                <div className="form-group">
                  <label className="form-label">Enter 6-digit Authenticator Token</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    className="form-input"
                    placeholder="000000"
                    style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '16px' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowMfaSetup(false)} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '12px' }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '12px' }}>Confirm Code</button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default ProfileSettings;
