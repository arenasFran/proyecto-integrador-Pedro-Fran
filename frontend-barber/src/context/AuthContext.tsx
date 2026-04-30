import { createContext, useContext, type ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  user: unknown | null;
  login: (user: unknown) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const login = (user: unknown) => {
    console.log('Login:', user);
  };
  const logout = () => {
    console.log('Logout');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: false, user: null, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}