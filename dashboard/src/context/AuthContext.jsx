import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('irl_token'));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('irl_user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = async (username, password) => {
    const res = await axios.post('/api/auth/login', { username, password });
    const { token: t, username: u } = res.data;
    setToken(t);
    setUser({ username: u });
    localStorage.setItem('irl_token', t);
    localStorage.setItem('irl_user', JSON.stringify({ username: u }));
    return res.data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('irl_token');
    localStorage.removeItem('irl_user');
  };

  // Set axios default auth header
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
