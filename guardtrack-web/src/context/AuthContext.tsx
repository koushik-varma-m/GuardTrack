import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../services/authService';

interface AuthContextType {
  user: { id: string; name: string; email: string; role: string } | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [{ user, token }, setAuth] = useState<{
    user: { id: string; name: string; email: string; role: string } | null;
    token: string | null;
  }>(() => {
    const storedToken = localStorage.getItem('token');
    const storedUserStr = localStorage.getItem('user');

    if (!storedToken || !storedUserStr) return { user: null, token: null };

    try {
      const storedUser = JSON.parse(storedUserStr);
      return {
        user: {
          id: storedUser.id,
          name: storedUser.name,
          email: storedUser.email,
          role: storedUser.role,
        },
        token: storedToken,
      };
    } catch (error) {
      console.error('Error parsing stored user:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return { user: null, token: null };
    }
  });

  const [isLoading] = useState(false);

  const login = (user: User, token: string) => {
    setAuth({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
    
    // Persist in localStorage
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuth({ user: null, token: null });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!user && !!token,
        isLoading,
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
