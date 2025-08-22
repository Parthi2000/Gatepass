import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePackages } from '../context/PackageContext';
import Navbar from '../components/common/Navbar';
import ApprovalCard from '../components/manager/ApprovalCard';
import { Package, CheckCircle, XCircle, LayoutGrid, List, RefreshCw, Search, Filter, X, ChevronDown, RotateCcw, Send, RotateCcw as RotateCcwIcon, Users, TruckIcon } from 'lucide-react';

// Helper function to format dates
const formatDate = (date: Date | string | undefined): string => {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const ManagerPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { packages, updatePackageStatus, managers, refreshData } = usePackages();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAllManagersView] = useState(false);
  const [showAllPackages, setShowAllPackages] = useState(false);
  const [showAllPending, setShowAllPending] = useState(false);
  const [showAllApproved, setShowAllApproved] = useState(false);
  const [showAllRejected, setShowAllRejected] = useState(false);
  const [showAllDispatched, setShowAllDispatched] = useState(false);
  
  // New filter/search state
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('date'); // 'date', 'priority', 'recipient'
  const [tableView, setTableView] = useState(false); // Set to true for table view by default
  
  // Handle filter state from navigation (when clicked from DashboardPage)
  useEffect(() => {
    if (location.state) {
      // Apply status filter if provided in navigation state
      if (location.state.statusFilter) {
        setStatusFilter(location.state.statusFilter);
        setShowFilters(true);
        setShowAllPackages(true);
      }
      
      // Clear the location state after applying filters
      window.history.replaceState({}, document.title);
    }
  }, [location]);
  
  // Rejection modal state
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [packageToReject, setPackageToReject] = useState<string>('');
  
  // Notification state
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ show: false, message: '', type: 'success' });
  
  // Auto-hide notification after 3 seconds
  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification.show]);
  
  // Rejection Modal Component
  const RejectionModal = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-medium text-slate-900 mb-4">Reject Package</h3>
          <p className="text-sm text-slate-600 mb-4">
            Please provide a reason for rejecting this package:
          </p>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="w-full border border-slate-300 rounded-md p-2 mb-4 h-24"
            placeholder="Enter rejection reason..."
          />
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowRejectionModal(false);
                setRejectionReason('');
              }}
              className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!rejectionReason.trim()) {
                  alert('Please provide a reason for rejection');
                  return;
                }
                
                try {
                  await updatePackageStatus(packageToReject, 'rejected', rejectionReason);
                  setShowRejectionModal(false);
                  setRejectionReason('');
                  setPackageToReject('');
                  alert('Package has been rejected successfully');
                } catch (error) {
                  console.error('Error rejecting package:', error);
                  alert('Failed to reject package. Please try again.');
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Auto-refresh packages every 30 seconds for real-time updates
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      // The packages context is already handling persistence
      // This will trigger a UI refresh without an explicit action
      setIsRefreshing(true);
      setTimeout(() => setIsRefreshing(false), 500);
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, []);
  
  // Manual refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };
  
  React.useEffect(() => {
    if (!user) {
      navigate('/');
    } else if (user.role !== 'manager') {
      navigate('/dashboard');
    }
  }, [user, navigate]);
  
  if (!user || user.role !== 'manager') return null;
  
  // Get all packages that need approval (either assigned to this manager or unassigned)
  // CONDITIONAL WORKFLOW: Only show packages that are ready for manager approval
  const pendingManagerPackages = packages.filter(pkg => {
    const status = pkg.status || (pkg as any).status;
    const assignedToManager = pkg.assignedToManager || (pkg as any).assigned_to_manager;
    const transportationType = pkg.transportationType || pkg.transportation_type;
    const logisticsProcessed = pkg.logistics_processed || pkg.logisticsProcessed;
    
    // Only show submitted packages that are assigned to this manager or unassigned
    if (status !== 'submitted') return false;
    if (assignedToManager && assignedToManager !== user?.id) return false;
    
    // CONDITIONAL WORKFLOW LOGIC:
    // 1. If transportation type is 'courier', package must be processed by logistics first
    // 2. If transportation type is 'byHand', package can go directly to manager
    if (transportationType === 'courier') {
      // Courier packages must be processed by logistics before manager can see them
      return logisticsProcessed === true || logisticsProcessed === 'true';
    } else if (transportationType === 'byHand') {
      // By hand packages go directly to manager (no logistics processing needed)
      return true;
    }
    
    // Default: show the package (for backward compatibility)
    return true;
  });
  
  // Separate assigned packages from unassigned ones
  const assignedManagerPkgs = pendingManagerPackages.filter(pkg => {
    const assignedToManager = pkg.assignedToManager || (pkg as any).assigned_to_manager;
    return assignedToManager === user?.id;
  });
  
  const unassignedManagerPkgs = pendingManagerPackages.filter(pkg => {
    const assignedToManager = pkg.assignedToManager || (pkg as any).assigned_to_manager;
    return !assignedToManager;
  });
  
  // For backward compatibility
  const assignedPackages = assignedManagerPkgs;
  
  // Debug logs
  console.log('All pending packages:', pendingManagerPackages);
  console.log('Assigned to me:', assignedManagerPkgs);
  console.log('Unassigned packages:', unassignedManagerPkgs);
  
  
  // Apply filters and search to packages
  const filterPackages = (packageList: any[]) => {
    return packageList.filter(pkg => {
      // Search filter
      const searchFields = [
        pkg.trackingNumber || '',
        pkg.description || '',
        pkg.recipient || '',
        pkg.to_address || '',
        pkg.notes || ''
      ].map(field => field.toLowerCase());
      
      const matchesSearch = searchQuery === '' || 
        searchFields.some(field => field.includes(searchQuery.toLowerCase()));
      
      // Date filter
      const submittedAt = pkg.submittedAt ? new Date(pkg.submittedAt) : null;
      const matchesDateRange = 
        (!dateRange.startDate || !submittedAt || new Date(dateRange.startDate) <= submittedAt) &&
        (!dateRange.endDate || !submittedAt || new Date(dateRange.endDate) >= submittedAt);
      
      // Status filter
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(pkg.status);
      
      // Priority filter
      const matchesPriority = priorityFilter.length === 0 || 
        (pkg.priority && priorityFilter.includes(pkg.priority));
      
      return matchesSearch && matchesDateRange && matchesStatus && matchesPriority;
    });
  }
  
  // Apply sorting to packages
  const sortPackages = (packageList: any[]) => {
    return [...packageList].sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      } else if (sortBy === 'priority') {
        const priorityMap: {[key: string]: number} = { 'high': 3, 'medium': 2, 'low': 1 };
        return (priorityMap[b.priority] || 0) - (priorityMap[a.priority] || 0);
      } else if (sortBy === 'recipient') {
        return (a.recipient || '').localeCompare(b.recipient || '');
      }
      return 0;
    });
  }
  
  // Apply filters and sorting to assigned packages
  const filteredAssignedPackages = sortPackages(filterPackages(assignedPackages));
  
  // Get pending packages (only 'submitted' status, not 'logistics_pending')
  const pendingPkgs = packages.filter((pkg: any) => pkg.status === 'submitted' && pkg.status !== 'logistics_pending');
  const approvedPkgs = packages.filter((pkg: any) => 
    pkg.status === 'approved' && (pkg.approvedBy === user?.id || pkg.approved_by === user?.id)
  );
  const rejectedPkgs = packages.filter((pkg: any) => 
    pkg.status === 'rejected' && (pkg.rejectedBy === user?.id || pkg.rejected_by === user?.id || pkg.assignedToManager === user?.id)
  );
  const dispatchedPkgs = packages.filter((pkg: any) => 
    (pkg.status === 'dispatched' || pkg.status === 'delivered' || pkg.status === 'completed' || pkg.status === 'shipped') && 
    (pkg.assignedToManager === user?.id || pkg.assigned_to_manager === user?.id || pkg.approvedBy === user?.id || pkg.approved_by === user?.id)
  );
  const processedPackages = [...approvedPkgs, ...rejectedPkgs];
  
  // Debug analytics
  console.log('Analytics Debug - Current user ID:', user?.id);
  console.log('Analytics Debug - All packages:', packages.length);
  console.log('Analytics Debug - Rejected packages:', rejectedPkgs.length, rejectedPkgs.map(pkg => ({
    id: pkg.id,
    status: pkg.status,
    assignedToManager: pkg.assignedToManager,
    assigned_to_manager: pkg.assigned_to_manager,
    rejectedBy: (pkg as any).rejectedBy,
    rejected_by: (pkg as any).rejected_by
  })));
  console.log('Analytics Debug - Approved packages:', approvedPkgs.length, approvedPkgs.map(pkg => ({
    id: pkg.id,
    status: pkg.status,
    approvedBy: (pkg as any).approvedBy,
    approved_by: (pkg as any).approved_by
  })));
  console.log('Analytics Debug - Dispatched packages:', dispatchedPkgs.length);
  console.log('Analytics Debug - All package statuses:', [...new Set(packages.map(pkg => pkg.status))]);
  console.log('Analytics Debug - Packages with dispatched status:', packages.filter(pkg => pkg.status === 'dispatched').map(pkg => ({
    id: pkg.id,
    status: pkg.status,
    assignedToManager: pkg.assignedToManager,
    assigned_to_manager: pkg.assigned_to_manager,
    approvedBy: (pkg as any).approvedBy,
    approved_by: (pkg as any).approved_by
  })));
  
  // Returnable packages section - show packages with return dates assigned to current manager
  const returnablePackages = packages.filter((pkg: any) => {
    const returnDate = pkg.returnDate || pkg.return_date;
    const isReturnable = pkg.isReturnable || pkg.is_returnable;
    const isAssignedToManager = 
      (pkg.assignedToManager === user?.id) || 
      (pkg.assigned_to_manager === user?.id);
    
    // Show packages that are either:
    // 1. Have a return date set, OR
    // 2. Are marked as returnable
    // AND are assigned to this manager
    return (returnDate || isReturnable) && isAssignedToManager;
  });
  
  // Debug returnable packages
  console.log('Returnable Packages Debug:', {
    totalPackages: packages.length,
    currentUserId: user?.id,
    returnableCount: returnablePackages.length,
    samplePackages: packages.slice(0, 3).map(pkg => ({
      id: pkg.id,
      returnDate: pkg.returnDate || pkg.return_date,
      isReturnable: pkg.isReturnable || pkg.is_returnable,
      assignedToManager: pkg.assignedToManager || pkg.assigned_to_manager,
      status: pkg.status
    }))
  });
  
  // Process other package categories
  
  // Calculate analytics for dashboard cards
  const analytics = {
    totalPending: pendingPkgs.filter(pkg => 
      !pkg.assignedToManager || pkg.assignedToManager === user?.id
    ).length,
    highPriority: pendingPkgs.filter(pkg => 
      pkg.priority === 'high' && (!pkg.assignedToManager || pkg.assignedToManager === user?.id)
    ).length,
    totalApproved: approvedPkgs.length,
    totalRejected: rejectedPkgs.length,
    totalDispatched: dispatchedPkgs.length,
    totalReturnable: returnablePackages.length,
    oldestPending: pendingPkgs.length > 0 ? Math.max(
      ...pendingPkgs
        .filter(pkg => !pkg.assignedToManager || pkg.assignedToManager === user?.id)
        .map(pkg => {
          const submittedDate = new Date(pkg.submittedAt || pkg.created_at);
          const daysDiff = Math.floor((new Date().getTime() - submittedDate.getTime()) / (1000 * 3600 * 24));
          return daysDiff;
        })
    ) : 0,
    // Legacy properties for backward compatibility
    pending: pendingPkgs.filter(pkg => 
      !pkg.assignedToManager || pkg.assignedToManager === user?.id
    ).length,
    approved: approvedPkgs.length,
    rejected: rejectedPkgs.length,
    dispatched: dispatchedPkgs.length,
    processed: processedPackages.length,
    returnable: returnablePackages.length
  };
  
  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setDateRange({ startDate: '', endDate: '' });
    setPriorityFilter([]);
    setSortBy('date');
    setShowAllPackages(false);
    setTableView(false);
  };
  

  
  const handleApprove = async (id: string, notes: string) => {
    try {
      // Get the package being approved
      const packageToApprove = packages.find(pkg => pkg.id === id);
      const trackingNumber = packageToApprove?.trackingNumber || packageToApprove?.tracking_number || id;
      
      // Check if this is a resubmitted package
      if (packageToApprove && packageToApprove.resubmitted && packageToApprove.previousRejection) {
        console.log(`Approving resubmitted package. Original rejected package ID: ${packageToApprove.previousRejection}`);
        
        // Mark the original rejected package as processed so it won't show in the rejected list
        // This is done by updating a special flag in the database
        // We'll also update the current package status to approved
        await updatePackageStatus(id, 'approved', notes);
        
        // Note: The filtering logic in EmployeePage already hides rejected packages that have been resubmitted
        // This is just an additional step to ensure consistency
      } else {
        // Regular approval for non-resubmitted packages
        await updatePackageStatus(id, 'approved', notes);
      }
      
      // Automatically refresh the data to show updated package status
      await refreshData();
      
      // Show success notification
      setNotification({
        show: true,
        message: `Package ${trackingNumber} has been successfully approved!`,
        type: 'success'
      });
      
    } catch (error) {
      console.error('Error approving package:', error);
      setNotification({
        show: true,
        message: 'Failed to approve package. Please try again.',
        type: 'error'
      });
    }
  };
  
  const handleReject = (id: string) => {
    // Show the rejection modal and set the package ID to be rejected
    setPackageToReject(id);
    setRejectionReason('');
    setShowRejectionModal(true);
  };
  
  const confirmRejection = async () => {
    if (packageToReject && rejectionReason.trim()) {
      try {
        const packageToRejectData = packages.find(pkg => pkg.id === packageToReject);
        const trackingNumber = packageToRejectData?.trackingNumber || packageToRejectData?.tracking_number || packageToReject;
        
        await updatePackageStatus(packageToReject, 'rejected', rejectionReason);
        
        // Show success notification
        setNotification({
          show: true,
          message: `Package ${trackingNumber} has been rejected.`,
          type: 'info'
        });
        
        setShowRejectionModal(false);
        setPackageToReject('');
        setRejectionReason('');
      } catch (error) {
        console.error('Error rejecting package:', error);
        setNotification({
          show: true,
          message: 'Failed to reject package. Please try again.',
          type: 'error'
        });
      }
    }
  };
  
  // Render the RejectionModal if showRejectionModal is true
  const renderRejectionModal = () => {
    if (!showRejectionModal) return null;
    return <RejectionModal />;
  };
  
  // Remove unused variable warning
  if (false) console.log(renderRejectionModal);

  // Render the main component
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {showRejectionModal && <RejectionModal />}
      <Navbar />
      
      {/* Notification Toast */}
      {notification.show && (
        <div className={`fixed top-20 right-4 z-50 max-w-sm w-full transform transition-all duration-300 ${
          notification.show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}>
          <div className={`rounded-lg shadow-lg p-4 ${
            notification.type === 'success' ? 'bg-green-500 text-white' :
            notification.type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {notification.type === 'success' && (
                  <CheckCircle className="h-5 w-5 mr-2" />
                )}
                {notification.type === 'error' && (
                  <XCircle className="h-5 w-5 mr-2" />
                )}
                {notification.type === 'info' && (
                  <Package className="h-5 w-5 mr-2" />
                )}
                <span className="font-medium">{notification.message}</span>
              </div>
              <button
                onClick={() => setNotification(prev => ({ ...prev, show: false }))}
                className="ml-4 text-white hover:text-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="container mx-auto px-4 py-8 flex-grow">
        <header className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Manager Dashboard</h1>
              <p className="text-slate-600">Review and approve package requests</p>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center px-3 py-2 rounded-md ${showFilters ? 'bg-blue-100 text-blue-700' : 'bg-white text-slate-600 hover:bg-slate-50'} border border-slate-200`}
                  title="Toggle filters"
                >
                  <Filter className="h-5 w-5 mr-1" />
                  Filters
                </button>
                
                <button
                  onClick={() => {
                    setShowAllPackages(!showAllPackages);
                    if (!showAllPackages) setTableView(true);
                    if (showAllPackages) setTableView(false);
                  }}
                  className={`flex items-center px-3 py-2 text-sm rounded-lg ${showAllPackages ? 'bg-blue-50 text-blue-600' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
                >
                  {showAllPackages ? 'Show Recent' : 'View All'}
                </button>
                
                <button
                  onClick={handleRefresh}
                  className={`flex items-center px-3 py-2 rounded-md ${isRefreshing ? 'bg-blue-100 text-blue-700' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'} border border-blue-200`}
                  title="Refresh data"
                >
                  <RefreshCw className={`h-5 w-5 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
              
              <div className="flex items-center space-x-2 bg-white rounded-lg border border-slate-200 p-1">
                <button 
                  onClick={() => {
                    setViewMode('grid');
                    setTableView(false);
                  }}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
                  title="Card view"
                >
                  <LayoutGrid className="h-5 w-5" />
                </button>
                
                <button 
                  onClick={() => {
                    setViewMode('list');
                    setTableView(true);
                  }}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
                  title="Table view"
                >
                  <List className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </header>
        
        {showFilters && (
          <div className="bg-white p-4 rounded-lg shadow-md mb-4 border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium text-slate-800 flex items-center">
                <Filter className="h-4 w-4 mr-2" /> Filter & Sort Packages
              </h3>
              <button 
                onClick={resetFilters}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
              >
                Reset filters <RotateCcwIcon className="h-3 w-3 ml-1" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
              {/* Search filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Search</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search packages..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5"
                    >
                      <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Date range filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                      className="w-full pl-2 pr-2 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                      className="w-full pl-2 pr-2 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>
              </div>
              
              {/* Priority filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                <div className="flex flex-wrap gap-2">
                  {['high', 'medium', 'low'].map(priority => (
                    <button
                      key={priority}
                      onClick={() => {
                        setPriorityFilter(prev => 
                          prev.includes(priority) 
                            ? prev.filter(p => p !== priority) 
                            : [...prev, priority]
                        );
                      }}
                      className={`px-2 py-1 rounded-md text-xs ${priorityFilter.includes(priority) 
                        ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                        : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'}`}
                    >
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Sort options */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sort By</label>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none bg-white"
                  >
                    <option value="date">Date (Newest First)</option>
                    <option value="priority">Priority (High to Low)</option>
                    <option value="recipient">Recipient (A-Z)</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Filter stats */}
            <div className="mt-3 text-xs text-slate-500 flex items-center justify-between">
              <div>
                <span className="font-medium">{filteredAssignedPackages.length}</span> of <span className="font-medium">{assignedPackages.length}</span> packages match your filters
              </div>
              {(searchQuery || dateRange.startDate || dateRange.endDate || priorityFilter.length > 0) && (
                <div className="flex items-center">
                  <span className="mr-1">Active filters:</span>
                  {searchQuery && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded mr-1">Search</span>}
                  {(dateRange.startDate || dateRange.endDate) && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded mr-1">Date</span>}
                  {priorityFilter.length > 0 && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">Priority ({priorityFilter.length})</span>}
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div 
            className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500 hover:shadow-md transition-shadow cursor-pointer hover:bg-blue-50"
            onClick={() => {
              document.getElementById('pending-packages-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-700">Pending</h3>
              <div className="flex items-center">
                <Package className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{analytics.totalPending}</p>
            <div className="mt-2 text-xs text-slate-500">
              <span>Awaiting for Approval</span>
            </div>
          </div>

          <div 
            className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500 hover:shadow-md transition-shadow cursor-pointer hover:bg-green-50"
            onClick={() => {
              document.getElementById('approved-packages-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-700">Approved</h3>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{analytics.approved}</p>
            <div className="mt-2 text-xs text-slate-600">
              <span>Ready for Dispatch</span>
            </div>
          </div>

          <div 
            className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-red-500 hover:shadow-md transition-shadow cursor-pointer hover:bg-red-50"
            onClick={() => {
              document.getElementById('rejected-packages-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-700">Rejected</h3>
              <div className="flex items-center">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{analytics.rejected}</p>
            <div className="mt-2 text-xs text-slate-600">
              <span>Return to Employee</span>
            </div>
          </div>
          
          <div 
            className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500 hover:shadow-md transition-shadow cursor-pointer hover:bg-blue-50"
            onClick={() => {
              document.getElementById('dispatched-packages-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-700">Dispatched</h3>
              <div className="flex items-center">
                <Send className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{analytics.dispatched}</p>
            <div className="mt-2 text-xs text-slate-600">
              <span>Successfully dispatched</span>
            </div>
          </div>
          
          <div 
            className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-indigo-500 hover:shadow-md transition-shadow cursor-pointer hover:bg-indigo-50"
            onClick={() => {
              document.getElementById('returnable-packages-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-700">Returnable</h3>
              <div className="flex items-center">
                <RotateCcw className="h-5 w-5 text-indigo-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{returnablePackages.length}</p>
            <div className="mt-2 text-xs text-slate-600">
              <span>Pending return</span>
            </div>
          </div>
        </div>
        
        <div id="pending-packages-section" className="mb-8">
          {!showAllManagersView && assignedPackages.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Package className="h-6 w-6 text-blue-600 mr-2" />
                  <h2 className="text-xl font-semibold text-slate-800">Pending Packages</h2>
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    {assignedPackages.length} package{assignedPackages.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <button
                  onClick={() => setShowAllPending(!showAllPending)}
                  className={`flex items-center px-4 py-2 rounded-md ${showAllPending ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
                >
                  {showAllPending ? 'Show Recent' : 'View All'}
                  <ChevronDown className={`ml-1 h-4 w-4 transform ${showAllPending ? 'rotate-180' : ''}`} />
                </button>
              </div>
              
              {filteredAssignedPackages.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200 text-center">
                  {assignedPackages.length === 0 ? (
                    <p className="text-slate-600">No packages are currently assigned to you for approval</p>
                  ) : (
                    <p className="text-slate-600">No packages match your current filters</p>
                  )}
                </div>
              ) : !tableView ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredAssignedPackages.map(pkg => (
                    <ApprovalCard 
                      key={pkg.id}
                      pkg={pkg}
                      onApprove={handleApprove}
                      onReject={handleReject}
                    />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 mb-8">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID/Tracking</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Recipient</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">To Address</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Submitted</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Transportation</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Gate Pass Type</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {filteredAssignedPackages.map(pkg => (
                        <tr key={pkg.id} className="hover:bg-sky-50 transition-colors duration-150">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-slate-900">{pkg.trackingNumber}</div>
                            
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-slate-900">
                            {pkg.description || pkg.itemDescription || 'not specified'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-slate-900">{pkg.recipient}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-slate-900">
                              {pkg.to_address || pkg.to_address || pkg.toAddress || 'Not specified'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-slate-500">{new Date(pkg.submittedAt).toLocaleDateString()}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${(pkg.isReturnable || pkg.is_returnable) 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-gray-100 text-gray-800'}`}>
                              {(pkg.isReturnable || pkg.is_returnable) ? 'Returnable' : 'Non-Returnable'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => handleApprove(pkg.id, '')}
                                className="bg-green-600 text-white px-4 py-1.5 rounded-md hover:bg-green-700 transition-colors text-sm font-medium whitespace-nowrap"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => handleReject(pkg.id)}
                                className="bg-red-600 text-white px-4 py-1.5 rounded-md hover:bg-red-700 transition-colors text-sm font-medium whitespace-nowrap"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {!showAllPackages && filteredAssignedPackages.length > 10 && (
                <div className="text-center mb-8">
                  <button 
                    onClick={() => setShowAllPackages(true)}
                    className="px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
                  >
                    View All {filteredAssignedPackages.length} Packages
                  </button>
                </div>
              )}
            </>
          )}
{/*           
          {!showAllManagersView && (
            <>
              <div className="flex items-center mb-4">
                <Package className="h-6 w-6 text-amber-600 mr-2" />
                <h2 className="text-xl font-semibold text-slate-800">{assignedPackages.length > 0 ? 'rejected packages' : 'rejected packages'}</h2>
              </div>
              
              {unassignedPackages.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200 text-center">
                  <p className="text-slate-600">No packages are awaiting assignment</p>
                </div>
              ) : (
                <>
                  {tableView ? (
                    <div className="overflow-x-auto rounded-lg border border-slate-200 mb-8">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID/Tracking</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Recipient</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">To Address</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Submitted</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Priority</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {unassignedPackages.map(pkg => (
                            <tr key={pkg.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm font-medium text-slate-900">{pkg.trackingNumber}</div>
                                <div className="text-sm text-slate-500">#{pkg.id}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm text-slate-900">{pkg.description}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm text-slate-900">{pkg.recipient}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm text-slate-900">{pkg.to_address || 'Not specified'}</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm text-slate-500">{new Date(pkg.submittedAt).toLocaleDateString()}</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${pkg.priority === 'high' ? 'bg-red-100 text-red-800' : pkg.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                  {pkg.priority}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex space-x-2">
                                  <button 
                                    onClick={() => handleApprove(pkg.id, '')}
                                    className="bg-green-600 text-white px-4 py-1.5 rounded-md hover:bg-green-700 transition-colors text-sm font-medium whitespace-nowrap"
                                  >
                                    Approve
                                  </button>
                                  <button 
                                    onClick={() => handleReject(pkg.id)}
                                    className="bg-red-600 text-white px-4 py-1.5 rounded-md hover:bg-red-700 transition-colors text-sm font-medium whitespace-nowrap"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-4 mb-8`}>
                      {(showAllPackages ? unassignedPackages : unassignedPackages.slice(0, 10)).map(pkg => (
                        <ApprovalCard 
                          key={pkg.id} 
                          pkg={pkg} 
                          onApprove={handleApprove}
                          onReject={handleReject}
                          isAssigned={false}
                        />
                      ))}
                    </div>
                  )}
                  
                  {!showAllPackages && unassignedPackages.length > 10 && (
                    <div className="text-center mb-8">
                      <button 
                        onClick={() => setShowAllPackages(true)}
                        className="px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
                      >
                        View All {unassignedPackages.length} Packages
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )} */}
          
          {/* All Managers View - Only showing packages assigned to current manager */}
          {showAllManagersView && (
            <>
              <div className="flex items-center mb-4">
                <Users className="h-6 w-6 text-indigo-600 mr-2" />
                <h2 className="text-xl font-semibold text-slate-800">My Assigned Packages</h2>
                <span className="ml-3 text-sm text-slate-500">
                  Only packages assigned to you are shown. Other managers cannot see or approve your packages.
                </span>
              </div>
              
              {managers.map(manager => {
                // Only show packages for the current logged-in manager
                if (manager.id !== user.id) return null;
                
                // Get packages assigned to this specific manager
                const managerPackages = packages.filter(pkg => 
                  pkg.status === 'submitted' && pkg.assignedToManager === manager.id
                );
                
                if (managerPackages.length === 0) return (
                  <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200 text-center">
                    <p className="text-slate-600">No packages are currently assigned to you for approval</p>
                  </div>
                );
                
                return (
                  <div key={manager.id} className="mb-8">
                    <div className="flex items-center mb-4 pl-4 border-l-4 border-indigo-400">
                      <h3 className="text-lg font-medium text-slate-800">{manager.name} (You)</h3>
                      <span className="ml-2 px-2 py-1 bg-indigo-50 text-xs rounded-full text-indigo-700 font-medium">
                        {managerPackages.length} package{managerPackages.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-4`}>
                      {managerPackages.map(pkg => (
                        <ApprovalCard 
                          key={pkg.id} 
                          pkg={pkg} 
                          onApprove={handleApprove}
                          onReject={handleReject}
                          isAssigned={true}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        
        </div>
        
        {/* Approved Packages Section */}
        <div id="approved-packages-section" className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
              <h2 className="text-xl font-semibold text-slate-800">Approved Packages</h2>
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                {approvedPkgs.length} package{approvedPkgs.length !== 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={() => setShowAllApproved(!showAllApproved)}
              className={`flex items-center px-4 py-2 rounded-md ${showAllApproved ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
            >
              {showAllApproved ? 'Show Recent' : 'View All'}
              <ChevronDown className={`ml-1 h-4 w-4 transform ${showAllApproved ? 'rotate-180' : ''}`} />
            </button>
          </div>
          
          {approvedPkgs.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200 text-center">
              <p className="text-slate-600">No approved packages yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-green-100 mb-8 bg-white">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-green-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID/Tracking</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Recipient</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Approved On</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {(showAllApproved ? approvedPkgs : approvedPkgs.slice(0, 5)).map(pkg => (
                    <tr key={pkg.id} className="hover:bg-green-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">{pkg.trackingNumber}</div>
                        
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-900">{pkg.description || 'not specified'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-900">{pkg.recipient}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-slate-500">
                          {pkg.approvedAt ? new Date(pkg.approvedAt).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full bg-green-100 text-green-800">
                          Approved
                        </span>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap">
                        <div className="flex justify-start">
                          <button
                            onClick={() => navigate(`/package/${pkg.id}`)}
                            className="bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap"
                          >
                            View Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Rejected Packages Section */}
        <div id="rejected-packages-section" className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <XCircle className="h-6 w-6 text-red-600 mr-2" />
              <h2 className="text-xl font-semibold text-slate-800">Rejected Packages</h2>
              <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                {rejectedPkgs.length} package{rejectedPkgs.length !== 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={() => setShowAllRejected(!showAllRejected)}
              className={`flex items-center px-4 py-2 rounded-md ${showAllRejected ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
            >
              {showAllRejected ? 'Show Recent' : 'View All'}
              <ChevronDown className={`ml-1 h-4 w-4 transform ${showAllRejected ? 'rotate-180' : ''}`} />
            </button>
          </div>
          
          {rejectedPkgs.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200 text-center">
              <p className="text-slate-600">No rejected packages yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-red-100 mb-8 bg-white">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-red-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID/Tracking</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Recipient</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rejected At</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rejected By</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Reason</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {(showAllRejected ? rejectedPkgs : rejectedPkgs.slice(0, 5)).map(pkg => (
                    <tr key={pkg.id} className="hover:bg-red-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">{pkg.trackingNumber}</div>
                        
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-900">{pkg.description || 'not specified'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-900">{pkg.recipient}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-slate-900">
                              {pkg.rejected_at ? new Date(pkg.rejected_at).toLocaleString() : 'N/A'}
                        </div>
                        
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                              {pkg.rejected_by_name || 'N/A'}
                            </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-900">{pkg.notes || 'No reason provided'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => navigate(`/package/${pkg.id}`)}
                            className="bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => {
                              setPackageToReject(pkg.id);
                              setRejectionReason('');
                              setShowRejectionModal(true);
                            }}
                            className="bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-md hover:bg-indigo-200 transition-colors text-sm font-medium whitespace-nowrap"
                          >
                            Resubmit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Returnable Packages Section */}
        <div id="returnable-packages-section" className="bg-indigo-50 rounded-lg shadow-sm border border-indigo-100 overflow-hidden mb-8 hover:shadow-md transition-shadow duration-200">
          <div className="px-6 py-4 border-b border-indigo-100 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <RotateCcwIcon className="h-6 w-6 text-indigo-600 mr-2" />
                <h2 className="text-xl font-semibold text-slate-800">Returnable Packages</h2>
                <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                  {returnablePackages.length} package{returnablePackages.length !== 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={() => setShowAllPackages(!showAllPackages)}
                className={`flex items-center px-4 py-2 rounded-md ${showAllPackages ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
              >
                {showAllPackages ? 'Show Recent' : 'View All'}
                <ChevronDown className={`ml-1 h-4 w-4 transform ${showAllPackages ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {returnablePackages.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tracking #</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Return Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-100">
                  {(showAllPackages ? returnablePackages : returnablePackages.slice(0, 5)).map(pkg => (
                    <tr key={pkg.id} className="bg-white hover:bg-indigo-50 transition-colors duration-150">
                      <td className="px-3 py-2 whitespace-nowrap font-semibold text-slate-800">
                        {pkg.trackingNumber || pkg.tracking_number}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {pkg.description || 'not specified'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatDate(pkg.returnDate || pkg.return_date)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          (pkg.returnStatus || pkg.return_status || '').toLowerCase() === 'returned' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {(pkg.returnStatus || pkg.return_status || 'pending').charAt(0).toUpperCase() + (pkg.returnStatus || pkg.return_status || 'pending').slice(1)}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/package/${pkg.id}`)}
                          className="bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              No returnable packages found.
            </div>
          )}
        </div>
        
        {/* Dispatched Packages Section */}
        <div id="dispatched-packages-section" className="bg-emerald-50 rounded-lg shadow-sm border border-emerald-100 overflow-hidden mb-8 hover:shadow-md transition-shadow duration-200">
          <div className="px-6 py-4 border-b border-emerald-100 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <TruckIcon className="h-6 w-6 text-emerald-600 mr-2" />
                  <h2 className="text-xl font-semibold text-slate-800">Dispatched Packages</h2>
                  <span className="ml-2 px-2 py-1 bg-emerald-100 text-emerald-800 text-xs font-medium rounded-full">
                    {packages.filter(pkg => pkg.status === 'dispatched').length} package{packages.filter(pkg => pkg.status === 'dispatched').length !== 1 ? 's' : ''}
                  </span>
                </div>
                {packages.filter(pkg => pkg.status === 'dispatched').length > 5 && (
                  <button
                    onClick={() => setShowAllDispatched(!showAllDispatched)}
                    className="flex items-center px-4 py-2 rounded-md bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                  >
                    {showAllDispatched ? 'Show Less' : 'View All'}
                    <ChevronDown className={`ml-1 h-4 w-4 transform ${showAllDispatched ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {packages.filter(pkg => pkg.status === 'dispatched').length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-emerald-100">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tracking #</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Recipient</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Dispatched Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-100">
                  {packages
                    .filter(pkg => pkg.status === 'dispatched')
                    .slice(0, showAllDispatched ? undefined : 5)
                    .map(pkg => (
                      <tr key={pkg.id} className="bg-white hover:bg-emerald-50 transition-colors duration-150">
                        <td className="px-3 py-2 whitespace-nowrap font-semibold text-slate-800">
                          {pkg.trackingNumber || pkg.tracking_number}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {pkg.description || 'not specified'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {pkg.recipient || 'N/A'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                        {formatDate(pkg.dispatchedAt || (pkg.dispatched_at ? new Date(pkg.dispatched_at) : undefined))}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-800">
                            Dispatched
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <button
                            onClick={() => navigate(`/package/${pkg.id}`)}
                            className="bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500">
              No packages have been dispatched yet.
            </div>
          )}
        </div>
      </div>
      
      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <XCircle className="h-6 w-6 text-red-500 mr-2" />
              Reject Package
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting this package. This will be visible to the employee who submitted it.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:border-blue-500 mb-4"
              rows={4}
              autoFocus
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRejectionModal(false);
                  setPackageToReject('');
                  setRejectionReason('');
                }}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 focus:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={confirmRejection}
                disabled={!rejectionReason.trim()}
                className={`px-4 py-2 text-white rounded focus:outline-none ${rejectionReason.trim() ? 'bg-red-600 hover:bg-red-700' : 'bg-red-300 cursor-not-allowed'}`}
              >
                Reject Package
              </button>
            </div>
          </div>
        </div>
      )}
      
      <footer className="bg-white border-t border-slate-200 py-4">
        <div className="container mx-auto px-4 text-center text-sm text-slate-600">
          DeliverySafe 2025 | Package Approval System
        </div>
      </footer>
    </div>
  );
};

export default ManagerPage;