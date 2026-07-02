import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, ShieldAlert, KeyRound, Mail, Shield, User } from 'lucide-react';

const Login = () => {
  const { login, verifyMfa } = useAuth();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState('Citizen');
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

  const handleQuickLogin = async (role) => {
    setError('');
    setSubmitting(true);
    try {
      const email = role === 'Citizen' ? '@gmail.com' : '@netra.gov';
      const res = await login(email, 'password');
      if (res.success) {
        redirectUser(res.role);
      }
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
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
      <div
        className="card-glass animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '40px',
          borderColor: selectedRole === 'Citizen' ? 'rgba(0, 240, 255, 0.25)' : 'rgba(0, 230, 118, 0.25)',
          boxShadow: selectedRole === 'Citizen' ? '0 0 25px rgba(0, 240, 255, 0.08)' : '0 0 25px rgba(0, 230, 118, 0.08)',
          transition: 'var(--transition-smooth)'
        }}
      >

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex',
            background: selectedRole === 'Citizen'
              ? 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(0, 102, 255, 0.1))'
              : 'linear-gradient(135deg, rgba(0, 230, 118, 0.1), rgba(0, 102, 255, 0.1))',
            padding: '16px',
            borderRadius: '16px',
            border: selectedRole === 'Citizen'
              ? '1px solid rgba(0, 240, 255, 0.2)'
              : '1px solid rgba(0, 230, 118, 0.2)',
            marginBottom: '16px',
            boxShadow: selectedRole === 'Citizen' ? '0 0 15px rgba(0, 240, 255, 0.05)' : '0 0 15px rgba(0, 230, 118, 0.05)',
            transition: 'var(--transition-smooth)'
          }}>
            <Eye size={32} color={selectedRole === 'Citizen' ? '#00f0ff' : '#00e676'} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', fontFamily: 'var(--font-display)' }}>NETRA LOG-IN</h2>
          <span style={{
            fontSize: '11px',
            color: selectedRole === 'Citizen' ? 'var(--accent-cyan)' : 'var(--accent-emerald)',
            letterSpacing: '0.15em',
            fontWeight: 'bold',
            transition: 'var(--transition-smooth)'
          }}>
            {selectedRole === 'Citizen' ? 'SECURE ACCESS SYSTEM' : 'TACTICAL COMMAND GRID'}
          </span>
        </div>

        {/* Role Selector Tabs */}
        <div style={{
          display: 'flex',
          background: 'rgba(10, 12, 16, 0.6)',
          borderRadius: '12px',
          padding: '4px',
          border: '1px solid var(--glass-border)',
          marginBottom: '24px'
        }}>
          <button
            type="button"
            onClick={() => setSelectedRole('Citizen')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'var(--transition-smooth)',
              background: selectedRole === 'Citizen' ? 'linear-gradient(135deg, rgba(0, 240, 255, 0.15), rgba(0, 102, 255, 0.15))' : 'transparent',
              color: selectedRole === 'Citizen' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              boxShadow: selectedRole === 'Citizen' ? '0 0 10px rgba(0, 240, 255, 0.1)' : 'none',
              border: selectedRole === 'Citizen' ? '1px solid rgba(0, 240, 255, 0.3)' : '1px solid transparent'
            }}
          >
            <User size={16} />
            Citizen
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole('Police')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'var(--transition-smooth)',
              background: selectedRole === 'Police' ? 'linear-gradient(135deg, rgba(0, 230, 118, 0.15), rgba(0, 102, 255, 0.15))' : 'transparent',
              color: selectedRole === 'Police' ? 'var(--accent-emerald)' : 'var(--text-secondary)',
              boxShadow: selectedRole === 'Police' ? '0 0 10px rgba(0, 230, 118, 0.1)' : 'none',
              border: selectedRole === 'Police' ? '1px solid rgba(0, 230, 118, 0.3)' : '1px solid transparent'
            }}
          >
            <Shield size={16} />
            Police
          </button>
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
                <label className="form-label">
                  {selectedRole === 'Citizen' ? 'Citizen Email' : ' Email'}
                </label>
                <div style={{ position: 'relative' }}>
                  {selectedRole === 'Citizen' ? (
                    <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
                  ) : (
                    <Shield size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
                  )}
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    placeholder={selectedRole === 'Citizen' ? "@gmail.com" : "@netra.gov"}
                    style={{
                      paddingLeft: '42px',
                      borderColor: selectedRole === 'Citizen' ? '' : 'rgba(0, 230, 118, 0.15)'
                    }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
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
            className="btn"
            style={{
              width: '100%',
              padding: '14px',
              marginTop: '10px',
              background: selectedRole === 'Citizen'
                ? 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))'
                : 'linear-gradient(135deg, var(--accent-emerald), var(--accent-blue))',
              color: '#000',
              boxShadow: submitting ? 'none' : (selectedRole === 'Citizen' ? '0 0 15px rgba(0, 240, 255, 0.25)' : '0 0 15px rgba(0, 230, 118, 0.25)'),
              transition: 'var(--transition-smooth)'
            }}
          >
            {submitting
              ? 'PROCESSING SECURE GRID...'
              : mfaRequired
                ? 'VERIFY SECURITY KEY'
                : selectedRole === 'Citizen'
                  ? 'SIGN IN'
                  : 'AUTHORIZE ACCESS'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
          {!mfaRequired ? (
            <p>
              {selectedRole === 'Citizen' ? 'New citizen user?' : 'New police staff?'}{' '}
              <Link
                to={`/register?role=${selectedRole}`}
                style={{
                  color: selectedRole === 'Citizen' ? '#00f0ff' : '#00e676',
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  transition: 'var(--transition-smooth)'
                }}
              >
                {selectedRole === 'Citizen' ? 'Create New Account' : 'Register Account'}
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
