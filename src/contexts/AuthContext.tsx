import React, { createContext, useContext, useState } from 'react';
import { UserProfile as AppUser, UserRole, Department } from '../types';
import { MOCK_USERS } from '../mockData';
import { toast } from 'sonner';

interface AuthContextType {
  user: AppUser | null;
  setUser: (user: AppUser | null) => void;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const savedUser = localStorage.getItem('blufig_logged_user');
      if (savedUser) {
        return JSON.parse(savedUser) as AppUser;
      }
    } catch (e) {
      console.warn('Could not parse saved user', e);
    }
    return null;
  });
  const [loading] = useState(false);

  React.useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('blufig_logged_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('blufig_logged_user');
      }
    } catch (e) {
      console.error('Could not save user to localStorage', e);
    }
  }, [user]);

  const logout = async () => {
    setUser(null);
    toast.info("Logged out successfully");
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
