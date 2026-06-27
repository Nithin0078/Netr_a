import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, ShieldAlert, KeyRound, Mail } from 'lucide-react';

const Login = () => {
  const { login, verifyMfa } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (mfaRequired) {
        const res = await verifyMfa(email, mfaCode);
        if (res.success) {
          redirectUser(res.role);
        }
      } else {
        const res = await login(email, password);
        if (res.mfaRequired) {
          setMfaRequired(true);
        } else if (res.success) {
          redirectUser(res.role);
        }
      }
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const redirectUser = (role) => {
    if (role === 'Citizen') {
      navigate('/citizen/dashboard');
    } else {
      navigate('/police/dashboard');
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at center, #10141d 0%, #0a0c10 100%)',
      fontFamily: 'var(--font-body)',
      padding: '24px'
    }}>
      <div className="card-glass animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '40px' }}>
        
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(0, 102, 255, 0.1))',
            padding: '16px',
            borderRadius: '16px',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            marginBottom: '16px',
            boxShadow: '0 0 15px rgba(0, 240, 255, 0.05)'
          }}>
            <Eye size={32} color="#00f0ff" />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', fontFamily: 'var(--font-display)' }}>NETRA LOG-IN</h2>
          <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', letterSpacing: '0.15em', fontWeight: 'bold' }}>
            SECURE ACCESS SYSTEM
          </span>
        </div>

        {error && (
          <div style={{
            background: 'rgba(255, 23, 68, 0.1)',
            border: '1px solid rgba(255, 23, 68, 0.2)',
            color: '#ff1744',
            padding: '12px 16px',
            borderRadius: '8px',
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

        <form onSubmit={handleSubmit}>
          {!mfaRequired ? (
            <>
              <div className="form-group">
                <label className="form-label">Tactical Access Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    placeholder="officer@netra.gov / citizen@gmail.com"
                    style={{ paddingLeft: '42px' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Encryption Password</label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    placeholder="••••••••"
                    style={{ paddingLeft: '42px' }}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="form-group">
              <label className="form-label" style={{ textAlign: 'center', color: '#ffb300' }}>
                Multi-Factor Authentication Required
              </label>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '16px' }}>
                Enter the 6-digit verification code from your Google Authenticator app.
              </p>
              <input
                type="text"
                required
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                className="form-input"
                placeholder="000 000"
                style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '8px', fontFamily: 'var(--font-mono)' }}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', marginTop: '10px' }}
          >
            {submitting ? 'PROCESSING SECURE GRID...' : mfaRequired ? 'VERIFY SECURITY KEY' : 'INITIATE CONNECTION'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
          {!mfaRequired ? (
            <p>
              New citizen user?{' '}
              <Link to="/register" style={{ color: '#00f0ff', textDecoration: 'none', fontWeight: 'bold' }}>
                Create Local Node
              </Link>
            </p>
          ) : (
            <button
              onClick={() => setMfaRequired(false)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Cancel & Use Password
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default Login;
