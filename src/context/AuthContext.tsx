import { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, UserRole } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Initialize user state from localStorage IMMEDIATELY (not in useEffect)
  // This prevents the flash of unauthenticated state on page load
  const getUserFromStorage = (): User | null => {
    try {
      const savedUser = localStorage.getItem('user');
      if (!savedUser) return null;
      
      const parsedUser = JSON.parse(savedUser);
      if (!parsedUser || typeof parsedUser !== 'object' || !parsedUser.email || !parsedUser.role) {
        console.error('Invalid user data in localStorage');
        localStorage.removeItem('user');
        return null;
      }
      
      return parsedUser as User;
    } catch (error) {
      console.error('Error retrieving user from localStorage', error);
      localStorage.removeItem('user');
      return null;
    }
  };
  
  // Initialize with synchronous localStorage check
  const [user, setUser] = useState<User | null>(getUserFromStorage());
  
  // Set up storage event listener for cross-tab sync
  useEffect(() => {
    console.log('Auth provider mounted, current user state:', user ? `${user.email} (${user.role})` : 'Not logged in');
    
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'user') {
        console.log('Storage event detected for user data');
        if (event.newValue === null) {
          // User logged out in another tab
          setUser(null);
        } else if (event.newValue) {
          // User logged in or changed in another tab
          try {
            const newUser = JSON.parse(event.newValue);
            setUser(newUser);
          } catch (e) {
            console.error('Error parsing user data from storage event', e);
          }
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log('Auth Context: Attempting login with:', { email });
      
      // Use the authService to authenticate with PostgreSQL
      const authenticatedUser = await authService.login(email, password);
      
      if (!authenticatedUser) {
        console.error('Authentication failed for user:', email);
        throw new Error('Invalid email or password');
      }
      
      // Ensure the user object has all necessary fields
      if (!authenticatedUser.email || !authenticatedUser.role) {
        console.error('User object missing critical fields:', authenticatedUser);
        throw new Error('Invalid user data returned from server');
      }
      
      console.log('Raw user data from API:', authenticatedUser);
      
      // Create a clean user object with only necessary fields to prevent circular references
      const cleanUser: User = {
        id: authenticatedUser.id,
        name: authenticatedUser.full_name || authenticatedUser.fullName || authenticatedUser.name || 'Unknown User',
        email: authenticatedUser.email,
        role: authenticatedUser.role as UserRole,
        full_name: authenticatedUser.full_name,
        fullName: authenticatedUser.fullName,
        employee_id: authenticatedUser.employee_id,
        employeeId: authenticatedUser.employeeId
      };
      
      console.log('Clean user object:', cleanUser);
      
      console.log('Auth Context: Login successful, setting user:', cleanUser);
      
      // First, save to localStorage so it's ready on page refresh
      const userJson = JSON.stringify(cleanUser);
      localStorage.setItem('user', userJson);
      console.log('User data saved to localStorage successfully');
      
      // Then update state
      setUser(cleanUser);
      
      return cleanUser;
    } catch (error) {
      console.error('Auth Context: Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    // Clear user from state and localStorage
    setUser(null);
    localStorage.removeItem('user');
    console.log('User logged out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};