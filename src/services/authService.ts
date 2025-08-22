import { User } from '../types';

const API_URL = 'http://localhost:8080/api';

/**
 * Authentication service for user login
 */
export const authService = {
  /**
   * Login a user with email and password
   */
  async login(email: string, password: string): Promise<User> {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Authentication failed');
      }
      
      const data = await response.json();
      // Store JWT token
      localStorage.setItem('token', data.access_token);
      
      // Get user info with token
      const userResponse = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${data.access_token}`
        }
      });
      
      if (!userResponse.ok) {
        throw new Error('Failed to get user info');
      }
      
      const user = await userResponse.json();
      console.log('User data from /auth/me:', user);
      return user;
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  },

  /**
   * Register a new user
   */
  async register(userData: {
    email: string;
    password: string;
    full_name: string;
    role: string;
    employee_id: string;
  }): Promise<User> {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  /**
   * Logout user
   */
  logout(): void {
    localStorage.removeItem('token');
  },

  /**
   * Get auth token
   */
  getToken(): string | null {
    return localStorage.getItem('token');
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }
};
