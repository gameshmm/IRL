import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('irl_token'));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('irl_user');
    return stored ? JSON.parse(stored) : null;
  });

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('irl_token');
    localStorage.removeItem('irl_user');
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  const login = async (username, password) => {
    const res = await axios.post('/api/auth/login', { username, password });
    const { token: t, username: u } = res.data;
    setToken(t);
    setUser({ username: u });
    localStorage.setItem('irl_token', t);
    localStorage.setItem('irl_user', JSON.stringify({ username: u }));
    axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    return res.data;
  };

  // Sincroniza header inicial do axios
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Interceptor global para expiração de token (401 / 403)
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          // Não desloga se o erro for na própria rota de login
          if (!error.config?.url?.includes('/api/auth/login')) {
            logout();
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [logout]);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
