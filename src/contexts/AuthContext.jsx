import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthed, setIsAuthed] = useState(() => {
    return localStorage.getItem('uta_auth') === 'true';
  });

  const authenticate = useCallback((password) => {
    if (password === '0519') {
      setIsAuthed(true);
      localStorage.setItem('uta_auth', 'true');
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setIsAuthed(false);
    localStorage.removeItem('uta_auth');
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthed, authenticate, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
