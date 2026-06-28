import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  Eye, LayoutDashboard, Video, FileText, User, LogOut,
  Bell, CheckSquare, ShieldAlert, FolderKanban, Shield,
  ClipboardList
} from 'lucide-react';

const Layout = () => {
  const { user, logout, changeRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications periodically
  useEffect(() => {
    if (!user) return;
    
    const fetchNotifications = async () => {
      try {
        const res = await axios.get('/notifications/');
        setNotifications(res.data);
        setUnreadCount(res.data.filter(n => !n.is_read).length);
      } catch (e) {
        console.error("Failed to fetch notifications:", e);
      }
    };
    
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkAsRead = async (id) => {
    try {
      await axios.put(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const isCitizen = user.role === 'Citizen';

  // Navigation Links
  const citizenLinks = [
    { label: 'Dashboard', path: '/citizen/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'CCTV Cameras', path: '/citizen/cameras', icon: <Video size={20} /> },
    { label: 'Submit Report', path: '/citizen/report', icon: <FileText size={20} /> },
    { label: 'Profile Settings', path: '/citizen/profile', icon: <User size={20} /> },
  ];

  const policeLinks = [
    { label: 'Command Center', path: '/police/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'Investigations', path: '/police/cases', icon: <FolderKanban size={20} /> },
    { label: 'Camera Requests', path: '/police/requests', icon: <Video size={20} /> },
  ];

  // Admin extra paths
  if (user.role === 'Admin') {
    policeLinks.push({
      label: 'Audit Trail',
      path: '/police/audit',
      icon: <ClipboardList size={20} />
    });
  }

  const activeLinks = isCitizen ? citizenLinks : policeLinks;

  return (
    <div className="main-wrapper">
      {/* SIDEBAR PANEL */}
      <aside className="sidebar">
        <div>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #00f0ff, #0066ff)',
              padding: '10px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Eye color="#000" size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '800', tracking: '0.05em' }}>NETRA</h2>
              <span style={{ fontSize: '10px', color: '#00f0ff', letterSpacing: '0.1em', fontWeight: 'bold' }}>TACTICAL CV</span>
            </div>
          </div>

          {/* Navigation */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activeLinks.map(link => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    color: isActive ? '#00f0ff' : '#94a3b8',
                    background: isActive ? 'rgba(0, 240, 255, 0.08)' : 'transparent',
                    textDecoration: 'none',
                    fontWeight: isActive ? '600' : '400',
                    transition: 'all 0.2s ease',
                    borderLeft: isActive ? '3px solid #00f0ff' : '3px solid transparent'
                  }}
                >
                  {link.icon}
                  <span style={{ fontSize: '15px' }}>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile footer */}
        <div style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          paddingTop: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'var(--bg-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <Shield size={18} color="#00f0ff" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.full_name}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'capitalize' }}>
                {user.role} {user.badge_number && `(Badge: ${user.badge_number})`}
              </div>
            </div>
          </div>
          {/* Mock Role Switcher (Auth Bypassed) */}
          <div style={{
            background: 'rgba(0, 240, 255, 0.03)',
            border: '1px solid rgba(0, 240, 255, 0.15)',
            borderRadius: '8px',
            padding: '10px',
            marginTop: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <span style={{ fontSize: '10px', color: 'var(--accent-cyan)', fontWeight: 'bold', letterSpacing: '0.05em' }}>
              TACTICAL ROLE SWITCHER
            </span>
            <select
              value={user.role}
              onChange={async (e) => {
                const newRole = e.target.value;
                const updatedUser = await changeRole(newRole);
                if (updatedUser) {
                  if (newRole === 'Citizen') {
                    navigate('/citizen/dashboard');
                  } else {
                    navigate('/police/dashboard');
                  }
                }
              }}
              style={{
                background: '#0c0f16',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '4px',
                padding: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                outline: 'none',
                width: '100%'
              }}
            >
              <option value="Citizen">Citizen Portal</option>
              <option value="Police Officer">Police Officer</option>
              <option value="Admin">Admin Console</option>
            </select>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary" style={{ width: '100%', padding: '10px' }}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* CONTENT REGION */}
      <main className="content-area">
        {/* TOP NAVBAR */}
        <header className="navbar">
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '700' }}>
              {isCitizen ? "Citizen Surveillance Hub" : "Police Control Dashboard"}
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
              Logged in as authorized personnel in system grid
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', position: 'relative' }}>
            {/* Notification trigger */}
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#fff',
                padding: '10px',
                borderRadius: '8px',
                cursor: 'pointer',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#ff1744',
                  color: 'white',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification list dropdown */}
            {showNotifDropdown && (
              <div className="card-glass" style={{
                position: 'absolute',
                top: '50px',
                right: '0',
                width: '360px',
                zIndex: 100,
                maxHeight: '400px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                  <h3 style={{ fontSize: '16px' }}>System Logs</h3>
                  <span style={{ fontSize: '12px', color: '#00f0ff' }}>{unreadCount} unread</span>
                </div>
                {notifications.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: '#64748b', fontSize: '14px' }}>
                    No alerts or notifications recorded.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {notifications.map(notif => (
                      <div
                        key={notif.id}
                        style={{
                          background: notif.is_read ? 'transparent' : 'rgba(255, 255, 255, 0.03)',
                          borderLeft: notif.is_read ? '3px solid transparent' : '3px solid #ffb300',
                          padding: '10px',
                          borderRadius: '4px',
                          fontSize: '13px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                          <span>{notif.title}</span>
                          {!notif.is_read && (
                            <button
                              onClick={() => handleMarkAsRead(notif.id)}
                              style={{ background: 'none', border: 'none', color: '#00e676', cursor: 'pointer', fontSize: '11px' }}
                            >
                              Dismiss
                            </button>
                          )}
                        </div>
                        <p style={{ color: '#94a3b8', marginTop: '4px', lineHeight: '1.4' }}>{notif.message}</p>
                        <span style={{ fontSize: '10px', color: '#64748b', display: 'block', marginTop: '6px' }}>
                          {new Date(notif.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* PAGE CONTENT MOUNTS HERE */}
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
