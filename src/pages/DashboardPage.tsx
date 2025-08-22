import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/common/Navbar';
import { 
  ArrowRight, 
  Clock, 
  CheckCircle, 
  XCircle, 
  SendToBack,
  RefreshCw
} from 'lucide-react';
import logoImg from '../assets/logo.png';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);
  
  if (!user) return null;
  
  const navigateToRolePage = () => {
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
        console.log('Unknown role:', user.role);
    }
  };
  
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 flex-grow">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-600">Welcome back, {user.name}</p>
        </header>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Dashboard
          </h2>
          
          <div className="flex items-center mb-6">
            <div className="h-16 w-16 rounded-full overflow-hidden bg-white border-2 border-blue-100 flex items-center justify-center mr-4 shadow-sm">
              <img src={logoImg} alt="Rangsons Aerospace Logo" className="w-full h-full object-contain" />
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-medium text-slate-800">
                {user.name}'s Workspace
              </h3>
              <p className="text-slate-600">
                {user.role === 'employee' && 'Submit and track package requests'}
                {user.role === 'manager' && 'Review and approve package requests'}
                {user.role === 'security' && 'Verify and track package movements'}
                {user.role === 'logistics' && 'Process courier and package logistics'}
                {user.role === 'admin' && 'Manage system settings and users'}
              </p>
            </div>
          </div>
          
          {/* Package Status Cards */}
          {(user.role === 'employee' || user.role === 'manager') && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {/* Pending Packages Card */}
              <div 
                className="bg-white rounded-lg shadow-md p-5 border border-amber-200 cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-amber-300"
                onClick={() => {
                  navigate(user.role === 'employee' ? '/employee' : '/manager', { 
                    state: { statusFilter: ['submitted'] } 
                  });
                }}
                title={`View ${user.role === 'employee' ? 'your' : 'all'} pending packages`}
              >
                <h3 className="text-slate-500 text-sm font-medium mb-1">Pending Packages</h3>
                <p className="text-3xl font-bold text-amber-600">-</p>
                <div className="flex items-center text-sm text-slate-600 mt-1">
                  <Clock className="h-4 w-4 mr-1" />
                  Awaiting approval
                </div>
              </div>
              
              {/* Approved Packages Card */}
              <div 
                className="bg-white rounded-lg shadow-md p-5 border border-green-200 cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-green-300"
                onClick={() => {
                  navigate(user.role === 'employee' ? '/employee' : '/manager', { 
                    state: { statusFilter: ['approved'] } 
                  });
                }}
                title={`View ${user.role === 'employee' ? 'your' : 'all'} approved packages`}
              >
                <h3 className="text-slate-500 text-sm font-medium mb-1">Approved Packages</h3>
                <p className="text-3xl font-bold text-green-600">-</p>
                <div className="flex items-center text-sm text-slate-600 mt-1">
                  <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                  Ready for dispatch
                </div>
              </div>
             
              {/* Rejected Packages Card */}
              
              <div 
                className="bg-white rounded-lg shadow-md p-5 border border-red-200 cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-red-300"
                onClick={() => {
                  navigate(user.role === 'employee' ? '/employee' : '/manager', { 
                    state: { statusFilter: ['rejected'] } 
                  });
                }}
                title={`View ${user.role === 'employee' ? 'your' : 'all'} rejected packages`}
              >
                <h3 className="text-slate-500 text-sm font-medium mb-1">Rejected Packages</h3>
                <p className="text-3xl font-bold text-red-600">-</p>
                <div className="flex items-center text-sm text-slate-600 mt-1">
                  <XCircle className="h-4 w-4 mr-1 text-red-500" />
                  Not approved
                </div>
              </div>
              
              {/* Dispatched Packages Card */}
              <div 
                className="bg-white rounded-lg shadow-md p-5 border border-blue-200 cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-blue-300"
                onClick={() => {
                  navigate(user.role === 'employee' ? '/employee' : '/manager', { 
                    state: { statusFilter: ['dispatched'] } 
                  });
                }}
                title={`View ${user.role === 'employee' ? 'your' : 'all'} dispatched packages`}
              >
                <h3 className="text-slate-500 text-sm font-medium mb-1">Dispatched</h3>
                <p className="text-3xl font-bold text-blue-600">-</p>
                <div className="flex items-center text-sm text-slate-600 mt-1">
                  <SendToBack className="h-4 w-4 mr-1 text-blue-500" />
                  Successfully delivered
                </div>
              </div>
            </div>
          )}
          
          {/* Returnable Packages Card for employees */}
          {user.role === 'employee' && (
            <div 
              className="bg-white rounded-lg shadow-md p-5 border border-indigo-200 cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-indigo-300 mb-6"
              onClick={() => {
                navigate('/employee', { 
                  state: { isReturnable: true } 
                });
              }}
              title="View your returnable packages"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-slate-500 text-sm font-medium mb-1">Returnable Packages</h3>
                  <p className="text-2xl font-bold text-indigo-600">-</p>
                </div>
                <RefreshCw className="h-8 w-8 text-indigo-400" />
              </div>
              <div className="text-sm text-slate-600 mt-1">
                Packages marked for return
              </div>
            </div>
          )}
          
          <button
            onClick={navigateToRolePage}
            className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
          >
            {user.role === 'employee' && 'Submit New Package'}
            {user.role === 'manager' && 'Review Packages'}
            {user.role === 'security' && 'Verify Packages'}
            {user.role === 'logistics' && 'Process Logistics'}
            {user.role === 'admin' && 'Manage System'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </button>
        </div>
        
        <footer className="bg-white border-t border-slate-200 py-4">
          <div className="container mx-auto px-4 text-center text-sm text-slate-600">
            DeliverySafe 2025 | Package Approval System
          </div>
        </footer>
      </div>
    </div>
  );
};

export default DashboardPage;
