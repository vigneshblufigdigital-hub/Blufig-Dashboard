import React, { createContext, useContext, useState } from 'react';
import { UserProfile as AppUser, UserRole, Department } from '../types';
import { MOCK_USERS } from '../mockData';
import { toast } from 'sonner';

interface AuthContextType {
  user: AppUser;
  setUser: (user: AppUser) => void;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser>(MOCK_USERS[0]);
  const [loading] = useState(false);

  const logout = async () => {
    // setUser(null); // Just keep user as is or reset to default
    toast.info("Mock logout: User kept as default admin");
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
