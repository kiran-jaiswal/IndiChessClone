import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AuthUser {
  email: string;

}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, email: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parseJwt(token: string): { sub: string; exp: number } | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
        atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = parseJwt(token);
  if (!payload) return true;
  return Date.now() >= payload.exp * 1000;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    setToken(null);
    setUser(null);
  }, []);

  const login = useCallback((newToken: string, email: string) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('userEmail', email);
    setToken(newToken);
    setUser({ email });
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedEmail = localStorage.getItem('userEmail');

    if (storedToken && storedEmail) {
      if (isTokenExpired(storedToken)) {
        logout();
      } else {
        setToken(storedToken);
        setUser({ email: storedEmail });
      }
    }
    setIsLoading(false);
  }, [logout]);

  // Check for OAuth2 token in URL and redirect to dashboard
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');

    if (urlToken) {
      const payload = parseJwt(urlToken);
      if (payload && !isTokenExpired(urlToken)) {
        login(urlToken, payload.sub);
        // Clean up URL and redirect to dashboard
        window.history.replaceState({}, document.title, '/dashboard');
        window.location.href = '/dashboard';
      }
    }
  }, [login]);

  return (
      <AuthContext.Provider
          value={{
            user,
            token,
            isAuthenticated: !!token && !!user,
            isLoading,
            login,
            logout,
          }}
      >
        {children}
      </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
