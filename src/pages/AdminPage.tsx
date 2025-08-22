import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/common/Navbar';
import { UserRole } from '../types';
import { X, User, Plus, Save, Trash } from 'lucide-react';

// API URL configuration - must match authService
const API_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api`;

// Mock data for when API fails
const MOCK_USERS: UserData[] = [
  { id: '1', name: 'John Employee', email: 'employee@example.com', role: 'employee' as UserRole, created_at: new Date().toISOString() },
  { id: '2', name: 'Sarah Manager', email: 'manager@example.com', role: 'manager' as UserRole, created_at: new Date().toISOString() },
  { id: '3', name: 'Emma Security', email: 'security@example.com', role: 'security' as UserRole, created_at: new Date().toISOString() },
  { id: '4', name: 'Admin User', email: 'admin@gmail.com', role: 'admin' as UserRole, created_at: new Date().toISOString() }
];

// Transform backend user data to frontend format
const transformUserData = (user: any): UserData => {
  return {
    id: user.id,
    name: user.full_name || user.name,
    full_name: user.full_name,
    email: user.email,
    role: user.role as UserRole,
    created_at: user.created_at,
    employee_id: user.employee_id
  };
};

interface UserData {
  id: string | number;
  full_name?: string;
  name: string; // For frontend compatibility
  email: string;
  role: UserRole;
  created_at?: string;
  employee_id?: string;
  password?: string; // Optional for updates
}

const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<{
    add: boolean;
    edit: boolean;
    delete: string | null; // Will store the ID of the user being deleted
  }>({
    add: false,
    edit: false,
    delete: null
  });
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  
  // Password reset states
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  
  // Form states
  const [newUser, setNewUser] = useState<{
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }>({ name: '', email: '', password: '', role: 'employee' });
  
  // Filter users based on search and role
  const filteredUsers = users.filter(user => {
    const userName = user.full_name;
    const matchesSearch = (userName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                        user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Handle password reset
  const handleResetPassword = async (userId: string | number) => {
    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    try {
      setResetPasswordLoading(true);
      
      // Use the apiRequest utility
      await apiRequest(`${API_URL}/users/${userId}/password`, {
        method: 'PUT',
        body: JSON.stringify({ password: newPassword })
      });
      
      // Show success message
      setError('Password reset successfully');
      setTimeout(() => setError(null), 3000);
      
      // Close the modal
      setShowResetPassword(false);
      setNewPassword('');
    } catch (err: any) {
      console.error('Error resetting password:', err);
      setError(err.message || 'Failed to reset password');
    } finally {
      setResetPasswordLoading(false);
    }
  };

  useEffect(() => {
    // Redirect if not admin
    if (!user) {
      navigate('/');
    } else if (user.role !== 'admin') {
      navigate('/dashboard');
    } else {
      // Fetch users
      fetchUsers();
    }
  }, [user, navigate]);
  
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    
    console.log('Fetching users with admin ID:', user?.id);
    
    try {
      // Use the apiRequest utility
      const data = await apiRequest(`${API_URL}/users`);
      console.log('Users fetched successfully:', data.length);
      
      // Transform backend data to frontend format
      const transformedUsers = Array.isArray(data) ? data.map(transformUserData) : [];
      setUsers(transformedUsers);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to fetch users');
      
      // Use mock data as fallback
      console.log('Using mock data as fallback');
      setUsers(MOCK_USERS);
      setError('Using mock data as fallback due to API error');
    } finally {
      setLoading(false);
    }
  };
  
  // Validate user input
  const validateUserInput = (user: { name: string; email: string; password?: string; role: UserRole }) => {
    if (!user.name || user.name.trim().length < 2) {
      return 'Name must be at least 2 characters';
    }
    
    if (!user.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
      return 'Please enter a valid email address';
    }
    
    if (user.password && user.password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    
    return null; // No validation errors
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate input
    const validationError = validateUserInput({...newUser, password: newUser.password || ''});
    if (validationError) {
      setError(validationError);
      return;
    }
    
    // Set loading state
    setActionLoading(prev => ({ ...prev, add: true }));
    
    try {
      console.log('Adding new user:', { ...newUser, password: '***' });
      
      // Use the apiRequest utility
      const addedUser = await apiRequest(`${API_URL}/users`, {
        method: 'POST',
        body: JSON.stringify({
          full_name: newUser.name,
          email: newUser.email,
          password: newUser.password,
          role: newUser.role
        })
      });
      
      console.log('User added successfully:', addedUser);
      
      // Reset form
      setNewUser({ name: '', email: '', password: '', role: 'employee' });
      setShowAddForm(false);
      
      // Refresh the user list
      await fetchUsers();
      
      // Show success message
      setError('User added successfully');
      setTimeout(() => setError(null), 3000);
    } catch (err: any) {
      console.error('Error adding user:', err);
      setError(err.message || 'Failed to add user');
    } finally {
      // Reset loading state
      setActionLoading(prev => ({ ...prev, add: false }));
    }
  };
  
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    setError(null);
    
    // Validate input
    const validationError = validateUserInput(editingUser);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    // Set loading state
    setActionLoading(prev => ({ ...prev, edit: true }));
    
    try {
      console.log('Updating user:', { ...editingUser, password: editingUser.password ? '***' : undefined });
      
      // Use the apiRequest utility
      const updatedUser = await apiRequest(`${API_URL}/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          full_name: editingUser.name,
          email: editingUser.email,
          role: editingUser.role
        })
      });
      
      console.log('User updated successfully:', updatedUser);
      
      // Refresh the user list
      await fetchUsers();
      
      // Reset the editing state
      setEditingUser(null);
      
      // Show success message
      setError('User updated successfully');
      setTimeout(() => setError(null), 3000);
    } catch (err: any) {
      console.error('Error updating user:', err);
      setError(err.message || 'Failed to update user');
    } finally {
      // Reset loading state
      setActionLoading(prev => ({ ...prev, edit: false }));
    }
  };

  const handleDeleteUser = async (id: string | number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    setError(null);
    
    // Set loading state
    setActionLoading(prev => ({ ...prev, delete: String(id) }));
    
    try {
      console.log('Deleting user with ID:', id);
      
      // Use the apiRequest utility
      await apiRequest(`${API_URL}/users/${id}`, {
        method: 'DELETE'
      });
      
      console.log('User deleted successfully');
      
      // Refresh the user list
      await fetchUsers();
      
      // Show success message
      setError('User deleted successfully');
      setTimeout(() => setError(null), 3000);
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setError(err.message || 'Failed to delete user');
    } finally {
      // Reset loading state
      setActionLoading(prev => ({ ...prev, delete: null }));
    }
  };
  
  // A utility wrapper for API calls that handles common errors and falls back to mock data
  const apiRequest = async (url: string, options: RequestInit = {}) => {
    // Set to false to make actual API calls to server
    const MOCK_MODE = false;
    
    if (MOCK_MODE) {
      console.log(`MOCK MODE: Simulating API call to ${url}`);
      
      // Add a small delay to simulate network request
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Handle mock responses based on URL and method
      if (url === '/api/users' && (!options.method || options.method === 'GET')) {
        console.log('Returning mock users data');
        return [...MOCK_USERS];
      }
      
      if (url === '/api/users' && options.method === 'POST') {
        try {
          const userData = JSON.parse(options.body as string);
          const newUser = {
            ...userData,
            id: `mock-${Date.now()}`,
            created_at: new Date().toISOString()
          };
          console.log('Adding mock user:', newUser);
          MOCK_USERS.push(newUser as UserData);
          return newUser;
        } catch (e) {
          console.error('Error parsing mock user data:', e);
          throw new Error('Invalid user data');
        }
      }
      
      if (url.includes('/api/users/') && options.method === 'PUT') {
        try {
          const userData = JSON.parse(options.body as string);
          const userId = url.split('/').pop();
          const userIndex = MOCK_USERS.findIndex(u => u.id === userId);
          
          if (userIndex === -1) {
            throw new Error('User not found');
          }
          
          const updatedUser = {
            ...userData,
            created_at: MOCK_USERS[userIndex].created_at
          };
          
          MOCK_USERS[userIndex] = updatedUser as UserData;
          console.log('Updated mock user:', updatedUser);
          return updatedUser;
        } catch (e) {
          console.error('Error updating mock user:', e);
          throw new Error('Failed to update user');
        }
      }
      
      if (url.includes('/api/users/') && options.method === 'DELETE') {
        const userId = url.split('/').pop();
        const userIndex = MOCK_USERS.findIndex(u => u.id === userId);
        
        if (userIndex === -1) {
          throw new Error('User not found');
        }
        
        const deletedUser = MOCK_USERS.splice(userIndex, 1)[0];
        console.log('Deleted mock user:', deletedUser);
        return { message: 'User deleted successfully' };
      }
      
      throw new Error('Mock API endpoint not implemented');
    }

    // Real API implementation (when MOCK_MODE is false)
    try {
      // Get token from localStorage (where authService stores it)
      const token = localStorage.getItem('token');
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
          ...(options.headers || {})
        }
      });
      
      // Get response text first for better error handling
      const responseText = await response.text();
      console.log(`API response from ${url}:`, responseText);
      
      // Handle empty responses
      if (!responseText || responseText.trim() === '') {
        if (response.ok) {
          // Empty response but successful status - this is ok for some operations like DELETE
          return {};
        }
        throw new Error(`Empty response from server with status ${response.status}`);
      }
      
      // Try to parse the response as JSON
      try {
        const data = JSON.parse(responseText);
        
        // Check if the response indicates an error
        if (!response.ok) {
          throw new Error(data.message || `API error: ${response.status}`);
        }
        
        return data;
      } catch (jsonError) {
        console.error('JSON parsing error:', jsonError);
        if (response.ok) {
          // If the response was OK but not JSON, just return an empty object
          return {};
        }
        throw new Error('Invalid JSON response from server');
      }
    } catch (err: any) {
      console.error(`API request failed for ${url}:`, err);
      throw err;
    }
  };
  
  // Error notification component
  const ErrorNotification = ({ message, type = 'error', onClose }: { message: string | null, type?: 'error' | 'success', onClose?: () => void }) => {
    if (!message) return null;
    
    return (
      <div className={`fixed top-4 right-4 p-4 rounded-md shadow-lg ${type === 'error' ? 'bg-red-500' : 'bg-green-500'} text-white max-w-md z-50 flex items-center`}>
        <div className="flex-grow">{message}</div>
        {onClose && (
          <button onClick={onClose} className="ml-4 text-white hover:text-white/80">
            <X size={18} />
          </button>
        )}
      </div>
    );
  };

  if (!user || user.role !== 'admin') return null;
  
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      {/* Error notification */}
      <ErrorNotification 
        message={error} 
        type={error?.includes('successfully') ? 'success' : 'error'} 
        onClose={() => setError(null)} 
      />
      
      <div className="container mx-auto px-4 py-8 flex-grow">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
          <p className="text-slate-600">Manage users and system settings</p>
        </header>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="bg-white shadow-md rounded-lg p-6 mb-8 border border-slate-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div className="w-full sm:w-auto">
              <h2 className="text-xl font-semibold text-slate-800 flex items-center">
                <User className="h-5 w-5 mr-2 text-blue-600" />
                User Management
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'} found
                {searchTerm && ` matching "${searchTerm}"`}
                {roleFilter !== 'all' && ` with role "${roleFilter}"`}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {/* Search Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search users..."
                  className="pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              {/* Role Filter */}
              <select
                className="border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="employee">Employee</option>
                <option value="security">Security</option>
                <option value="logistics">Logistics</option>
              </select>
              
              {/* Add User Button */}
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center justify-center text-sm hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                <Plus className="h-4 w-4 mr-1" />
                {showAddForm ? 'Cancel' : 'Add User'}
              </button>
            </div>
          </div>
          
          {showAddForm && (
            <div className="mb-6 bg-blue-50 p-4 rounded-md">
              <h3 className="text-lg font-medium text-blue-800 mb-3">Add New User</h3>
              
              <form onSubmit={handleAddUser}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-1">
                      Role
                    </label>
                    <select
                      id="role"
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="security">Security</option>
                      <option value="logistics">Logistics</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center text-sm hover:bg-blue-700 transition-colors"
                    disabled={actionLoading.add}
                  >
                    {actionLoading.add ? (
                      <>
                        <span className="animate-spin mr-1">⟳</span>
                        Adding User...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-1" />
                        Save User
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {loading ? (
            <div className="text-center py-4">Loading users...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredUsers.map((userData) => (
                    <tr key={userData.id}>
                      <td className="px-4 py-3">{userData.name}</td>
                      <td className="px-4 py-3">{userData.email}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          userData.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                          userData.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                          userData.role === 'security' ? 'bg-green-100 text-green-800' :
                          userData.role === 'logistics' ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => setEditingUser(userData)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit User"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1 7.778 7.778 5.5 5.5 0 0 1-7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              setEditingUser(userData);
                              setShowResetPassword(true);
                            }}
                            className="text-green-600 hover:text-green-800"
                            title="Reset Password"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1 7.778 7.778 5.5 5.5 0 0 1-7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteUser(userData.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete User"
                            disabled={actionLoading.delete === userData.id}
                          >
                            {actionLoading.delete === userData.id ? (
                              <div className="animate-spin">⟳</div>
                            ) : (
                              <Trash size={18} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Reset Password Modal */}
        {showResetPassword && editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[1000] p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-slate-800">
                  Reset Password for {editingUser.name}
                </h3>
                <button 
                  onClick={() => {
                    setShowResetPassword(false);
                    setNewPassword('');
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-6 py-2">
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-slate-700 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    minLength={6}
                    autoFocus
                    className="w-full px-4 py-2 border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-500 mt-1">Must be at least 6 characters</p>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetPassword(false);
                      setNewPassword('');
                    }}
                    className="bg-slate-500 text-white px-4 py-2 rounded-md text-sm hover:bg-slate-600 transition-colors"
                    disabled={resetPasswordLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResetPassword(editingUser?.id)}
                    disabled={!newPassword || newPassword.length < 6 || resetPasswordLoading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resetPasswordLoading ? (
                      <>
                        <span className="animate-spin mr-1">⟳</span>
                        Resetting...
                      </>
                    ) : (
                      'Reset Password'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-slate-800 mb-4">Edit User</h3>
              
              <form onSubmit={handleUpdateUser}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="edit-name" className="block text-sm font-medium text-slate-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="edit-name"
                      value={editingUser.name}
                      onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="edit-email" className="block text-sm font-medium text-slate-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      id="edit-email"
                      value={editingUser.email}
                      onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="edit-role" className="block text-sm font-medium text-slate-700 mb-1">
                      Role
                    </label>
                    <select
                      id="edit-role"
                      value={editingUser.role}
                      onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="security">Security</option>
                      <option value="logistics">Logistics</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="bg-slate-500 text-white px-4 py-2 rounded-md text-sm hover:bg-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center text-sm hover:bg-blue-700 transition-colors"
                    disabled={actionLoading.edit}
                  >
                    {actionLoading.edit ? (
                      <>
                        <span className="animate-spin mr-1">⟳</span>
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-1" />
                        Update User
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;