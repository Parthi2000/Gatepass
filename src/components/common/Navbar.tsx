import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, LogOut } from 'lucide-react';
import logoImg from '../../assets/logo.png';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) return null;

  // Debug log to help with troubleshooting
  console.log('Navbar user data:', user);
  
  // Get the user's display name from the most likely fields
  const displayName = user.full_name || user.fullName || user.name || user.email.split('@')[0];
  
  // Debug log to show what name will be displayed
  console.log('Display name:', displayName, 'from fields:', {
    full_name: user.full_name,
    fullName: user.fullName,
    name: user.name,
    email: user.email
  });

  return (
    <nav className="glass-effect shadow-md border-b border-slate-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center">
              <div className="rounded-full overflow-hidden w-10 h-10 mr-2 border-2 border-blue-100 flex items-center justify-center bg-white">
                <img src={logoImg} alt="Rangsons Aerospace Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-xl font-bold text-primary">Rangsons Aerospace</span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* {user.role === 'employee' && (
              <Link to="/employee" className="px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-blue-50 transition">
                Submit Package
              </Link>
            )}
             */}
            {/* {user.role === 'manager' && (
              <Link to="/manager" className="px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-blue-50 transition">
                Approve Packages
              </Link>
            )}
             */}
            {/* {user.role === 'security' && (
              <Link to="/security" className="px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-blue-50 transition">
                Verify Packages
              </Link>
            )} */}
            
            <div className="flex items-center ml-4">
              <User className="h-5 w-5 mr-1 text-slate-600" />
              <span className="text-sm text-slate-700">{displayName}</span>
              {/* <span className="ml-2 px-2 py-1 bg-blue-50 text-xs rounded-full text-blue-700 font-medium capitalize">
                {user.role}
              </span> */}
            </div>
            
            <button 
              onClick={handleLogout}
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-blue-50 transition"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;