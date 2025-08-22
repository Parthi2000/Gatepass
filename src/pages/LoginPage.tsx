import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader, LockKeyhole } from 'lucide-react';
import logoImg from '../assets/logo.png';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      // Role is now automatically detected from the database
      console.log('Attempting login with:', { email, password });
      const user = await login(email, password);
      
      // Navigate based on role
      if (user) {
        console.log(`${user.role} login successful, navigating to appropriate page`);
        switch (user.role) {
          case 'employee':
            navigate('/employee');
            break;
          case 'manager':
            navigate('/manager');
            break;
          case 'security':
            navigate('/security');
            break;
          case 'logistics':
            navigate('/logistics');
            break;
          case 'admin':
            navigate('/admin');
            break;
          default:
            // Fallback
            navigate('/');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  // Login handling is complete
  
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 w-32 h-32 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-5 animate-float"></div>
        <div className="absolute top-2/3 left-1/3 w-64 h-64 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-5 animate-float-delayed"></div>
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-sky-400 rounded-full mix-blend-multiply filter blur-3xl opacity-5 animate-float-slow"></div>
      </div>
      
      <div className="max-w-md w-full relative z-10">
        {/* Login card with shadow */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100 transition-all duration-500 hover:shadow-xl">
          <div className="relative">
            <div className="text-center mb-10">
              <div className="flex justify-center mb-6 relative">
                {/* Logo with shadow effect */}
                <div className="rounded-full overflow-hidden w-24 h-24 border-4 border-blue-100 shadow-lg flex items-center justify-center bg-white relative group-hover:scale-105 transition-transform duration-300">
                  <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-full"></div>
                  <img src={logoImg} alt="Rangsons Aerospace Logo" className="w-full h-full object-contain p-1" />
                </div>
                <div className="absolute -bottom-1 w-36 h-8 bg-blue-500 filter blur-xl opacity-10 rounded-full"></div>
              </div>
              <h1 className="text-4xl font-bold text-slate-800 mb-2 tracking-tight">Rangsons Aerospace</h1>
              <p className="text-slate-600 text-lg">Package Approval System</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm animate-fade-in flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}
              
              <div className="group">
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2 transition-all duration-300 group-focus-within:text-blue-600">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-slate-800 placeholder-slate-400 transition-all duration-300 shadow-sm"
                    placeholder="Enter your email"
                    required
                  />
                  <div className="absolute left-4 top-3.5 text-slate-400 transition-all duration-300 group-focus-within:text-blue-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="group">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2 transition-all duration-300 group-focus-within:text-blue-600">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-slate-800 placeholder-slate-400 transition-all duration-300 shadow-sm"
                    placeholder="Enter your password"
                    required
                  />
                  <div className="absolute left-4 top-3.5 text-slate-400 transition-all duration-300 group-focus-within:text-blue-500">
                    <LockKeyhole className="h-5 w-5" />
                  </div>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                {isLoading ? (
                  <>
                    <Loader className="animate-spin h-5 w-5 mr-3" />
                    Signing in...
                  </>
                ) : (
                  <span className="flex items-center">Sign In <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg></span>
                )}
              </button>
            </form>
            
            <div className="mt-10 text-center">
              <p className="text-sm text-slate-500">&copy; 2025 Rangsons Aerospace</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
