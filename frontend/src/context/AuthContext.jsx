import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// Configure root API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
axios.defaults.baseURL = `${API_URL}/api`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('netra_access_token'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('netra_refresh_token'));
  const [loading, setLoading] = useState(true);

  // Set Authorization Header
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }

  // Axios Interceptors for Token Refresh (401 Retry)
  useEffect(() => {
    const refreshInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry && refreshToken) {
          originalRequest._retry = true;
          try {
            const res = await axios.post('/auth/refresh', { refresh_token: refreshToken });
            const { access_token, refresh_token } = res.data;
            
            localStorage.setItem('netra_access_token', access_token);
            localStorage.setItem('netra_refresh_token', refresh_token);
            
            setToken(access_token);
            setRefreshToken(refresh_token);
            
            originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
            return axios(originalRequest);
          } catch (refreshError) {
            // Refresh token expired too, force logout
            logout();
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(refreshInterceptor);
    };
  }, [refreshToken]);

  // Check auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await axios.get('/users/me');
          setUser(res.data);
        } catch (e) {
          console.error("Auth initialization failed:", e);
          logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  const login = async (email, password) => {
    try {
      const res = await axios.post('/auth/login', { email, password });
      
      if (res.data.mfa_required) {
        return { mfaRequired: true, email };
      }
      
      const { access_token, refresh_token, role, full_name } = res.data;
      storeTokens(access_token, refresh_token);
      
      const userRes = await axios.get('/users/me');
      setUser(userRes.data);
      return { success: true, role };
    } catch (e) {
      throw e.response?.data?.detail || "Authentication failed. Connect to backend.";
    }
  };

  const verifyMfa = async (email, code) => {
    try {
      const res = await axios.post('/auth/verify-mfa', { email, mfa_token: code });
      const { access_token, refresh_token, role } = res.data;
      storeTokens(access_token, refresh_token);
      
      const userRes = await axios.get('/users/me');
      setUser(userRes.data);
      return { success: true, role };
    } catch (e) {
      throw e.response?.data?.detail || "MFA token verification failed.";
    }
  };

  const register = async (fullName, email, password, phoneNumber) => {
    try {
      const res = await axios.post('/auth/register', {
        full_name: fullName,
        email,
        password,
        phone_number: phoneNumber
      });
      const { access_token, refresh_token, role } = res.data;
      storeTokens(access_token, refresh_token);
      
      const userRes = await axios.get('/users/me');
      setUser(userRes.data);
      return { success: true, role };
    } catch (e) {
      throw e.response?.data?.detail || "Registration failed.";
    }
  };

  const logout = () => {
    localStorage.removeItem('netra_access_token');
    localStorage.removeItem('netra_refresh_token');
    setToken(null);
    setRefreshToken(null);
    setUser(null);
  };

  const storeTokens = (accessToken, refToken) => {
    localStorage.setItem('netra_access_token', accessToken);
    localStorage.setItem('netra_refresh_token', refToken);
    setToken(accessToken);
    setRefreshToken(refToken);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, verifyMfa, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
