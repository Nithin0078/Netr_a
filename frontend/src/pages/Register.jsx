import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, ShieldAlert, User, Mail, Phone, Lock, Shield, Building, Award } from 'lucide-react';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const queryParams = new URLSearchParams(window.location.search);
  const initialRoleParam = queryParams.get('role') || 'Citizen';

  const [selectedRole, setSelectedRole] = useState(initialRoleParam === 'Police' ? 'Police' : 'Citizen');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Police specific fields
  const [badgeNumber, setBadgeNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [policeRole, setPoliceRole] = useState('Police Officer');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const finalRole = selectedRole === 'Citizen' ? 'Citizen' : policeRole;
      const res = await register(
        fullName,
        email,
        password,
        phone,
        finalRole,
        selectedRole === 'Citizen' ? null : badgeNumber,
        selectedRole === 'Citizen' ? null : department
      );
      if (res.success) {
        if (finalRole === 'Citizen') {
          navigate('/citizen/dashboard');
        } else {
          navigate('/police/dashboard');
        }
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
          maxWidth: '480px',
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
          <h2 style={{ fontSize: '24px', fontWeight: '800', fontFamily: 'var(--font-display)' }}>
            {selectedRole === 'Citizen' ? 'CREATE CITIZEN NODE' : 'CREATE POLICE PROFILE'}
          </h2>
          <span style={{
            fontSize: '11px',
            color: selectedRole === 'Citizen' ? 'var(--accent-cyan)' : 'var(--accent-emerald)',
            letterSpacing: '0.15em',
            fontWeight: 'bold',
            transition: 'var(--transition-smooth)'
          }}>
            {selectedRole === 'Citizen' ? 'NETRA NETWORK REGISTRATION' : 'TACTICAL COMMAND AUTHORIZATION'}
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
            Police Staff
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
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div style={{ position: 'relative' }}>
              <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="form-input"
                placeholder=""
                style={{ paddingLeft: '42px' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              {selectedRole === 'Citizen' ? 'Citizen Email' : 'Command Access Email'}
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder={selectedRole === 'Citizen' ? "@example.com" : "officer@netra.gov"}
                style={{ paddingLeft: '42px' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Contact Phone Number</label>
            <div style={{ position: 'relative' }}>
              <Phone size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="form-input"
                placeholder="+1 555-019-2834"
                style={{ paddingLeft: '42px' }}
              />
            </div>
          </div>

          {selectedRole === 'Police' && (
            <>
              <div className="form-group">
                <label className="form-label">Badge Number</label>
                <div style={{ position: 'relative' }}>
                  <Award size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
                  <input
                    type="text"
                    required
                    value={badgeNumber}
                    onChange={(e) => setBadgeNumber(e.target.value)}
                    className="form-input"
                    placeholder="1234"
                    style={{ paddingLeft: '42px' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Department / Unit</label>
                <div style={{ position: 'relative' }}>
                  <Building size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="form-input"
                    placeholder="Netra Central Command"
                    style={{ paddingLeft: '42px' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Command Role Assignment</label>
                <div style={{ position: 'relative' }}>
                  <Shield size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
                  <select
                    value={policeRole}
                    onChange={(e) => setPoliceRole(e.target.value)}
                    className="form-input"
                    style={{
                      paddingLeft: '42px',
                      background: 'rgba(10, 12, 16, 0.8)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="Police Officer">Police Officer</option>
                    <option value="Admin">System Admin</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="Minimum 6 characters"
                style={{ paddingLeft: '42px' }}
              />
            </div>
          </div>

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
              ? 'GENERATING KEYPAIR...'
              : selectedRole === 'Citizen'
                ? 'REGISTER'
                : 'CREATE ACCOUNT'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <p>
            Already have a node?{' '}
            <Link to="/login" style={{ color: selectedRole === 'Citizen' ? '#00f0ff' : '#00e676', textDecoration: 'none', fontWeight: 'bold' }}>
              Authorize Stream
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Register;
