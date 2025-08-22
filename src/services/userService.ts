import { User } from '../types';
import { authService } from './authService';

const API_URL = 'http://localhost:8080/api';

/**
 * User-related API operations
 */
export const userService = {
  /**
   * Get all users
   */
  async getAllUsers(): Promise<User[]> {
    try {
      const token = authService.getToken();
      const response = await fetch(`${API_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('User data from FastAPI:', data);
      
      return data.map((user: any) => ({
        ...user,
        id: user.id.toString(),
        employeeId: user.employee_id || user.employeeId,
        fullName: user.full_name || user.fullName || user.name,
        createdAt: new Date(user.created_at || user.createdAt),
        updatedAt: new Date(user.updated_at || user.updatedAt)
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  /**
   * Get users by role
   */
  async getUsersByRole(role: string): Promise<User[]> {
    try {
      const token = authService.getToken();
      const response = await fetch(`${API_URL}/users?role=${role}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`Users with role ${role}:`, data);
      
      return data.map((user: any) => ({
        ...user,
        id: user.id.toString(),
        employeeId: user.employee_id || user.employeeId,
        fullName: user.full_name || user.fullName || user.name,
        createdAt: new Date(user.created_at || user.createdAt),
        updatedAt: new Date(user.updated_at || user.updatedAt)
      }));
    } catch (error) {
      console.error(`Error fetching users with role ${role}:`, error);
      throw error;
    }
  },

  /**
   * Get managers
   */
  async getManagers(): Promise<User[]> {
    try {
      const token = authService.getToken();
      const response = await fetch(`${API_URL}/users/managers`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Managers data from FastAPI:', data);
      
      return data.map((user: any) => ({
        ...user,
        id: user.id.toString(),
        employeeId: user.employee_id || user.employeeId,
        fullName: user.full_name || user.fullName || user.name,
        createdAt: new Date(user.created_at || user.createdAt),
        updatedAt: new Date(user.updated_at || user.updatedAt)
      }));
    } catch (error) {
      console.error('Error fetching managers:', error);
      throw error;
    }
  },

  /**
   * Get all managers (alias for getManagers)
   */
  async getAllManagers(): Promise<User[]> {
    return this.getManagers();
  },

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    try {
      const token = authService.getToken();
      const response = await fetch(`${API_URL}/users/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return {
        ...data,
        id: data.id.toString(),
        employeeId: data.employee_id || data.employeeId,
        fullName: data.full_name || data.fullName || data.name,
        createdAt: new Date(data.created_at || data.createdAt),
        updatedAt: new Date(data.updated_at || data.updatedAt)
      };
    } catch (error) {
      console.error(`Error fetching user with ID ${id}:`, error);
      return null;
    }
  }
};
