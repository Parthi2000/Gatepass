import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useDashboard } from '../context/DashboardContext';
import { DashboardWidgets } from '../components/dashboard/DashboardWidgets';
import { DashboardControls, AddWidgetModal } from '../components/dashboard/DashboardCustomizer';
import { DashboardWidgetConfig } from '../types/dashboard';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/common/Navbar';
import PackageFormSimplified from '../components/employee/PackageFormSimplified';
import GatePass from '../components/barcode/GatePass';
import { usePackages } from '../context/PackageContext';
import StatusBadge from '../components/common/StatusBadge';
import { 
  CheckCircle2, 
  RefreshCw, 
  Clock, 
  LayoutGrid, 
  List, 
  Search, 
  Filter, 
  X, 
  CheckCircle, 
  XCircle, 
  SendToBack,
  Package,
  ChevronDown,
  RotateCcw,
  ExternalLink
} from 'lucide-react';
import { toast } from 'react-toastify';

const EmployeePage: React.FC = () => {
  const { user } = useAuth();
  
  // Create refs for each section to enable scrolling
  const pendingRef = useRef<HTMLDivElement>(null);
  const approvedRef = useRef<HTMLDivElement>(null);
  const rejectedRef = useRef<HTMLDivElement>(null);
  const dispatchedRef = useRef<HTMLDivElement>(null);
  const returnableRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { packages, refreshData, updatePackageReturnStatus, submitPackage } = usePackages();
  const [submittedPackage, setSubmittedPackage] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [packageToResubmit, setPackageToResubmit] = useState<any>(null);
  const [isResubmitting, setIsResubmitting] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [showAllPackages, setShowAllPackages] = useState(false);
  
  // Dashboard customization state
  const { config, updateConfig } = useDashboard();
  const [showAddWidgetModal, setShowAddWidgetModal] = useState(false);
  
  // Toggle to show only pending packages
  const togglePendingOnly = () => {
    updateConfig({
      showPendingOnly: !config.showPendingOnly
    });
  };
  
  // Function to handle dashboard widget clicks
  const handleDashboardWidgetClick = (status: string) => {
    // Set the status filter to show only packages with this status
    setStatusFilter([status]);
    setShowFilters(true);
    setShowAllPackages(true); // Show all packages, not just recent ones
    
    // Get the corresponding ref for this status
    let targetRef;
    switch (status) {
      case 'submitted':
        targetRef = pendingRef;
        break;
      case 'approved':
        targetRef = approvedRef;
        break;
      case 'rejected':
        targetRef = rejectedRef;
        break;
      case 'dispatched':
        targetRef = dispatchedRef;
        break;
      default:
        break;
    }
    
    // Scroll to the corresponding section
    if (targetRef && targetRef.current) {
      setTimeout(() => {
        targetRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };
  
  // Handle returnable packages widget click
  const handleReturnableWidgetClick = () => {
    // Show only returnable packages
    setShowAllPackages(true);
    setStatusFilter([]);
    setPriorityFilter([]);
    
    // Scroll to returnable section
    setTimeout(() => {
      returnableRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Handle filter state from navigation (when clicked from DashboardPage)
  useEffect(() => {
    if (location.state) {
      // Apply status filter if provided in navigation state
      if (location.state.statusFilter) {
        setStatusFilter(location.state.statusFilter);
        setShowFilters(true);
        setShowAllPackages(true);
      }
      
      // Handle returnable filter if provided
      if (location.state.isReturnable) {
        // We'll handle this by showing the returnable section and scrolling to it
        setShowAllPackages(true);
        setTimeout(() => {
          const returnableSection = document.getElementById('returnable-packages-section');
          if (returnableSection) {
            returnableSection.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
      
      // Clear the location state after applying filters
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Socket.IO setup for real-time updates - disabled since backend doesn't support it
  // useEffect(() => {
  //   const socket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001');
    
  //   socket.on('connect', () => {
  //     console.log('Connected to Socket.IO server');
  //   });
    
  //   socket.on('package_created', (data) => {
  //     console.log('New package created:', data);
  //     if (refreshData) refreshData();
  //   });
    
  //   socket.on('package_status_updated', (data) => {
  //     console.log('Package status updated:', data);
  //     if (refreshData) refreshData();
  //   });
    
  //   socket.on('disconnect', () => {
  //     console.log('Disconnected from Socket.IO server');
  //   });
    
  //   return () => {
  //     socket.disconnect();
  //   };
  // }, [refreshData]);
  
  // Auto-refresh packages every 30 seconds for real-time updates
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (refreshData) {
        setIsRefreshing(true);
        refreshData().finally(() => {
          setTimeout(() => setIsRefreshing(false), 500);
        });
      }
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, [refreshData]);
  
  // Manual refresh function
  const handleRefresh = () => {
    if (refreshData) {
      setIsRefreshing(true);
      refreshData().finally(() => {
        setTimeout(() => setIsRefreshing(false), 500);
      });
    }
  };
  
  React.useEffect(() => {
    if (!user) {
      navigate('/');
    } else if (user.role !== 'employee') {
      navigate('/dashboard');
    }
  }, [user, navigate]);
  
  if (!user || user.role !== 'employee') return null;
  
  // DIAGNOSTIC - Log all package IDs in the system
  console.log('DIAGNOSTIC - All packages in the system:', packages.map(p => ({ id: p.id, tracking: p.trackingNumber, status: p.status })));
  
  // Get employee's packages - handle both camelCase and snake_case property names
  const employeePackages = packages.filter(pkg => {
    // Type-safe approach to handle both camelCase and snake_case
    let submittedById: string | undefined = pkg.submittedBy;
    let status = pkg.status;
    
    // Also check for snake_case properties
    if (submittedById === undefined && (pkg as any).submitted_by) {
      submittedById = (pkg as any).submitted_by;
    }
    if (!status && (pkg as any).status) {
      status = (pkg as any).status;
    }
    
    // Add debug info for this specific package
    console.log(`Package ID ${pkg.id}:`, {
      tracking: pkg.trackingNumber,
      submittedBy: submittedById,
      currentUser: user.id,
      status: status,
      match: submittedById === user.id
    });
    
    return submittedById === user.id;
  });
  
  console.log('All employee packages:', employeePackages);
  
  // Reset resubmission state
  const resetResubmission = () => {
    setPackageToResubmit(null);
    setIsResubmitting(false);
  };

  const handlePackageSubmit = async (packageData: FormData) => {
    try {
      const submittedPackage = await submitPackage(packageData);
      // Fetch the full package details using the new endpoint
      const response = await fetch(`/api/packages/${submittedPackage.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch package details');
      }
      const fullPackageData = await response.json();
      setSubmittedPackage(fullPackageData);
    } catch (error) {
      console.error('Error submitting package:', error);
    }
  };
  
  // Apply filters to employee packages
  const filteredPackages = employeePackages.filter(pkg => {
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
    
    // Status filter - if showPendingOnly is true, only show pending packages
    const matchesStatus = config.showPendingOnly 
      ? pkg.status === 'submitted' // Only pending/submitted packages
      : (statusFilter.length === 0 || statusFilter.includes(pkg.status)); // Normal filtering
    
    // Priority filter
    const matchesPriority = priorityFilter.length === 0 || 
      (pkg.priority && priorityFilter.includes(pkg.priority));
    
    return matchesSearch && matchesDateRange && matchesStatus && matchesPriority;
  });
  
  // Filter packages by status and returnability
  const pendingPackages = filteredPackages.filter(pkg => {
    const status = (pkg.status || (pkg as any).status) as string;
    const isDispatched = pkg.dispatched_at || pkg.dispatchedAt || status === 'dispatched';
    
    console.log(`Package ${pkg.id} - Status: ${status}, isDispatched: ${isDispatched}`);
    
    // Only include packages that are:
    // 1. Not dispatched, AND
    // 2. In submitted status only (not returnable packages)
    return !isDispatched && (status === 'submitted');
  });
  
  const approvedPackages = filteredPackages.filter(pkg => {
    const status = pkg.status || (pkg as any).status;
    return status === 'approved';
  });
  
  // Create a map to track which packages have been resubmitted or have approved resubmissions
  const resubmissionMap = new Map<string, boolean>();
  
  // First pass - find all packages marked as resubmissions and record their rejection sources
  filteredPackages.forEach(pkg => {
    // If this is a resubmitted package, mark its original rejected package
    if (pkg.resubmitted && pkg.previousRejection) {
      resubmissionMap.set(pkg.previousRejection, true);
      
      // If this resubmitted package is approved, definitely hide the original rejection
      if (pkg.status === 'approved' || pkg.status === 'dispatched') {
        console.log(`Package ${pkg.id} is an approved resubmission of rejected package ${pkg.previousRejection}`);
      } else {
        console.log(`Package ${pkg.id} is a resubmission of rejected package ${pkg.previousRejection}`);
      }
    }
    
    // Special case: if this is the package currently being resubmitted, also mark it
    if (packageToResubmit && pkg.id === packageToResubmit.id) {
      resubmissionMap.set(pkg.id, true);
      console.log(`Package ${pkg.id} is currently being resubmitted`);
    }
  });
  
  // For debugging
  console.log('Rejected packages that should be hidden:', Array.from(resubmissionMap.keys()));
  
  // Filter rejected packages and exclude those that have been resubmitted or have approved resubmissions
  const rejectedPackages = filteredPackages.filter(pkg => {
    // Only include rejected packages that haven't been resubmitted or don't have approved resubmissions
    const isRejected = pkg.status === 'rejected' && !pkg.isReturnable;
    const shouldHide = resubmissionMap.has(pkg.id);
    
    // Log for debugging
    if (isRejected && shouldHide) {
      console.log(`Hiding rejected package ${pkg.id} because it has been resubmitted or its resubmission is approved`);
    }
    
    return isRejected && !shouldHide;
  });
  // First, identify all dispatched packages
  const dispatchedPackages = filteredPackages.filter(pkg => {
    const status = pkg.status || (pkg as any).status;
    return status === 'dispatched';
  });
  
  // Filter returnable packages - include all packages explicitly marked as returnable
  const returnablePackages = filteredPackages.filter(pkg => {
    const isMarkedReturnable = pkg.isReturnable || (pkg as any).is_returnable || false;
    const status = pkg.status || (pkg as any).status;
    const returnStatus = pkg.returnStatus || (pkg as any).return_status;
    console.log(`Package ${pkg.id} - isMarkedReturnable: ${isMarkedReturnable}, status: ${status}, returnStatus: ${returnStatus}`);
    return isMarkedReturnable === true;
  });
  
  console.log('Returnable packages count:', returnablePackages.length, 'Details:', returnablePackages.map(p => ({
    id: p.id,
    tracking: p.trackingNumber || p.tracking_number,
    isReturnable: p.isReturnable || (p as any).is_returnable,
    status: p.status,
    returnStatus: p.returnStatus || p.return_status,
    returnDate: p.returnDate || p.return_date
  })));

  
  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setDateRange({ startDate: '', endDate: '' });
    setStatusFilter([]);
    setPriorityFilter([]);
    setShowAllPackages(false);
  };
  
  // Limit packages to 10 most recent unless "view all" is selected
  const limitPackages = (pkgs: any[]) => {
    if (showAllPackages || pkgs.length <= 10) return pkgs;
    return pkgs.slice(0, 10);
  };
  
  // Handle return status update
  const handleReturnStatusUpdate = async (packageId: string, newStatus: 'pending' | 'returned' | 'overdue') => {
    try {
      await updatePackageReturnStatus(packageId, newStatus);
      toast.success('Return status updated successfully');
    } catch (error) {
      console.error('Error updating return status:', error);
      toast.error('Failed to update return status');
    }
  };
  
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 flex-grow">
        <header className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-semibold text-slate-800">My Packages</h1>
              <button
                onClick={togglePendingOnly}
                className={`px-3 py-1 text-xs rounded-full flex items-center ${config.showPendingOnly ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}
              >
                <Clock className="h-3 w-3 mr-1" />
                {config.showPendingOnly ? 'Showing Pending Only' : 'Show All Packages'}
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-md flex items-center"
                title="Refresh packages"
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? '' : ''}
              </button>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 hover:bg-slate-100 rounded-md ${showFilters ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}
                title="Toggle filters"
              >
                <Filter className="h-4 w-4" />
              </button>
              
              <div className="hidden md:flex border border-slate-200 rounded-md overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                  title="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                  title="List view"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Dashboard customization controls */}
          <DashboardControls onAddWidget={() => setShowAddWidgetModal(true)} />
          
          {/* Filter section */}
          {showFilters && (
            <div className="bg-white p-4 rounded-lg shadow-md mb-4 border border-slate-200">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-slate-800 flex items-center">
                  <Filter className="h-4 w-4 mr-2" /> Filter Packages
                </h3>
                <button 
                  onClick={resetFilters}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                >
                  Reset filters <RotateCcw className="h-3 w-3 ml-1" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search filter */}
                <div className="relative">
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
                
                {/* Status filter */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {['submitted', 'approved', 'rejected', 'dispatched'].map(status => (
                      <button
                        key={status}
                        onClick={() => {
                          setStatusFilter(prev => 
                            prev.includes(status) 
                              ? prev.filter(s => s !== status) 
                              : [...prev, status]
                          );
                        }}
                        className={`px-2 py-1 rounded-md text-xs ${statusFilter.includes(status) 
                          ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                          : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'}`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Priority filter */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <div className="flex flex-wrap gap-2">
                    {['low', 'medium', 'high'].map(priority => (
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
              </div>
              
              {/* Filter stats */}
              <div className="mt-3 text-xs text-slate-500 flex items-center justify-between">
                <div>
                  <span className="font-medium">{filteredPackages.length}</span> of <span className="font-medium">{employeePackages.length}</span> packages match your filters
                </div>
                {(searchQuery || dateRange.startDate || dateRange.endDate || statusFilter.length > 0 || priorityFilter.length > 0) && (
                  <div className="flex items-center">
                    <span className="mr-1">Active filters:</span>
                    {searchQuery && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded mr-1">Search</span>}
                    {(dateRange.startDate || dateRange.endDate) && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded mr-1">Date</span>}
                    {statusFilter.length > 0 && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded mr-1">Status ({statusFilter.length})</span>}
                    {priorityFilter.length > 0 && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">Priority ({priorityFilter.length})</span>}
                  </div>
                )}
              </div>
            </div>
          )}
        </header>
        
        {/* Customizable Dashboard Widgets */}
        <DashboardWidgets 
          packageCounts={{
            submitted: pendingPackages.length,
            approved: approvedPackages.length,
            rejected: rejectedPackages.length,
            dispatched: dispatchedPackages.length,
            returnable: returnablePackages.length
          }}
          onCardClick={handleDashboardWidgetClick}
          onReturnableClick={handleReturnableWidgetClick}
        />
        
        {/* Widget add modal */}
        {showAddWidgetModal && (
          <AddWidgetModal
            onClose={() => setShowAddWidgetModal(false)}
            onAddWidget={(widget: DashboardWidgetConfig) => {
              updateConfig({
                widgets: [...config.widgets, widget]
              });
            }}
          />
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div id="package-form-section">
              {isResubmitting && packageToResubmit && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-md flex items-center">
                  <RotateCcw className="h-5 w-5 mr-2" />
                  <div>
                    <p className="font-medium">Resubmitting Rejected Package</p>
                    <p className="text-sm">Make necessary changes to the form below and submit again.</p>
                  </div>
                </div>
              )}
              <PackageFormSimplified 
                onSubmit={handlePackageSubmit} 
                packageToResubmit={packageToResubmit}
                resetResubmission={resetResubmission}
              />
            </div>
            
            {submittedPackage && (
              <div id="gate-pass-section" className="mt-6">
                <div className="mb-4 p-3 bg-green-100 border border-green-200 text-green-700 rounded-md flex items-center">
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  <span>Package submitted successfully! Please print the gate pass below.</span>
                </div>
                
                <GatePass packageData={submittedPackage} />
              </div>
            )}
          </div>
          
          <div>
            {/* Pending Packages Section */}
            <div ref={pendingRef} className="bg-white shadow-sm rounded-lg p-6 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-amber-500"></div>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                  <Clock className="h-6 w-6 text-amber-600 mr-2" />
                  <h2 className="text-xl font-semibold text-slate-800">Pending Packages</h2>
                </div>
                
                {pendingPackages.length > 0 && (
                  <div className="flex items-center space-x-3">
                    <span className="text-sm bg-amber-50 text-amber-700 px-3 py-1 rounded-full border border-amber-200">
                      {pendingPackages.length} pending
                    </span>
                  </div>
                )}
              </div>
              
              {pendingPackages.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
                  <Package className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600">You don't have any pending packages.</p>
                </div>
              ) : (
                <>
                  {/* Always display pending packages in table format */}
                  <div className="overflow-x-auto rounded-lg border border-amber-200 mt-4">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-amber-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">Tracking #</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">Description</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">Recipient</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">Date</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {limitPackages(pendingPackages).map((pkg) => (
                          <tr key={pkg.id} className="hover:bg-amber-50/30">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{pkg.trackingNumber || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{pkg.description || pkg.itemDescription || 'Package'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{pkg.recipient || pkg.recipientName}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <StatusBadge status={pkg.status} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                              {new Date(pkg.submittedAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                              <Link to={`/package/${pkg.id}`} className="text-blue-600 hover:text-blue-800 mr-3">
                                <ExternalLink className="h-4 w-4 inline" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* View All Button - Enhanced */}
                  {!showAllPackages && pendingPackages.length > 10 && (
                    <div className="text-center mt-6">
                      <button 
                        onClick={() => setShowAllPackages(true)}
                        className="inline-flex items-center px-6 py-2.5 bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 rounded-lg hover:from-amber-100 hover:to-amber-200 transition-all duration-200 border border-amber-200 shadow-sm"
                      >
                        View All {pendingPackages.length} Pending Packages
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
            <br/>
                        {/* Rejected Packages Section - NEW */}
            <div ref={rejectedRef} className="bg-white shadow-sm rounded-lg p-6 relative overflow-hidden mb-6">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-500"></div>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                  <XCircle className="h-6 w-6 text-red-600 mr-2" />
                  <h2 className="text-xl font-semibold text-slate-800">Rejected Packages</h2>
                </div>
                
                {rejectedPackages.length > 0 && (
                  <div className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100">
                    {rejectedPackages.length} package(s) need attention
                  </div>
                )}
              </div>
              
              {rejectedPackages.length === 0 ? (
                <p className="text-slate-600 text-center py-4">
                  You don't have any rejected packages.
                </p>
              ) : (
                <div className="space-y-6">
                  <p className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
                    The following packages were rejected and need to be revised and resubmitted. Check the rejection reason and make necessary corrections.
                  </p>
                  
                  {/* Always display rejected packages in table format */}
                  <div className="overflow-x-auto rounded-lg border border-red-200 mt-4">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-red-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">Tracking #</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">Description</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">Recipient</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">Rejected At</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">Reason</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">Rejected By</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-red-700 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {limitPackages(rejectedPackages).map((pkg) => (
                          <tr key={pkg.id} className="hover:bg-red-50/30">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{pkg.trackingNumber || (pkg as any).tracking_number || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{pkg.description || pkg.itemDescription || 'Package'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{pkg.recipient || pkg.recipientName}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <StatusBadge status={pkg.status} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                              {pkg.rejected_at ? new Date(pkg.rejected_at).toLocaleString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-900">
                              {pkg.notes || 'No reason provided'}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-900">
                              {pkg.rejected_by_name || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                              <div className="flex space-x-3">
                                <Link to={`/package/${pkg.id}`} className="text-blue-600 hover:text-blue-800">
                                  <ExternalLink className="h-4 w-4 inline" />
                                </Link>
                                <button
                                  onClick={() => {
                                    setPackageToResubmit(pkg);
                                    setIsResubmitting(true);
                                    const formSection = document.getElementById('package-form-section');
                                    if (formSection) {
                                      formSection.scrollIntoView({ behavior: 'smooth' });
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-800 flex items-center"
                                >
                                  <RefreshCw className="h-4 w-4 inline" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {!showAllPackages && rejectedPackages.length > 10 && (
                    <div className="text-center mt-4">
                      <button 
                        onClick={() => setShowAllPackages(true)}
                        className="px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
                      >
                        View All {rejectedPackages.length} Rejected Packages
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Approved Packages Section */}
            <div ref={approvedRef} className="bg-white shadow-sm rounded-lg p-6 relative overflow-hidden mb-6">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-green-500"></div>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                  <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
                  <h2 className="text-xl font-semibold text-slate-800">Approved Packages</h2>
                </div>
                
                {approvedPackages.length > 0 && (
                  <div className="flex items-center space-x-3">
                    <span className="text-sm bg-green-50 text-green-700 px-3 py-1 rounded-full border border-green-200">
                      {approvedPackages.length} approved
                    </span>
                  </div>
                )}
              </div>
              
              {approvedPackages.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
                  <Package className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600">You don't have any approved packages.</p>
                </div>
              ) : (
                <>
                  {/* Always display approved packages in table format */}
                  <div className="overflow-x-auto rounded-lg border border-green-200 mt-4">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-green-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">Tracking #</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">Description</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">Recipient</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">Date</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-green-700 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {limitPackages(approvedPackages).map((pkg) => (
                          <tr key={pkg.id} className="hover:bg-green-50/30">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{pkg.trackingNumber || pkg.tracking_number || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{pkg.description || pkg.itemDescription || 'Package'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{pkg.recipient || pkg.recipientName}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <StatusBadge status={pkg.status} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                              {new Date(pkg.submittedAt || pkg.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                              <Link to={`/package/${pkg.id}`} className="text-blue-600 hover:text-blue-800 mr-3">
                                <ExternalLink className="h-4 w-4 inline" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {!showAllPackages && approvedPackages.length > 10 && (
                    <div className="text-center mt-6">
                      <button 
                        onClick={() => setShowAllPackages(true)}
                        className="inline-flex items-center px-6 py-2.5 bg-gradient-to-r from-green-50 to-green-100 text-green-700 rounded-lg hover:from-green-100 hover:to-green-200 transition-all duration-200 border border-green-200 shadow-sm"
                      >
                        <span className="mr-2">View All {approvedPackages.length} Approved Packages</span>
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Dispatched Packages Section */}
            <div ref={dispatchedRef} className="bg-white shadow-sm rounded-lg p-6 relative overflow-hidden mb-6">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-500"></div>
              <div className="flex items-center mb-4">
                <SendToBack className="h-6 w-6 text-blue-600 mr-2" />
                <h2 className="text-xl font-semibold text-slate-800">Dispatched Packages</h2>
              </div>
              
              {dispatchedPackages.length === 0 ? (
                <p className="text-slate-600 text-center py-4">
                  You don't have any dispatched packages.
                </p>
              ) : (
                <>
                  {/* Always display dispatched packages in table format */}
                  <div className="overflow-x-auto rounded-lg border border-blue-200 mt-4">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-blue-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Tracking #</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Description</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Recipient</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Date</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {limitPackages(dispatchedPackages).map((pkg) => (
                          <tr key={pkg.id} className="hover:bg-blue-50/30">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{pkg.trackingNumber || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{pkg.description || pkg.itemDescription || 'Package'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{pkg.recipient || pkg.recipientName}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <StatusBadge status={pkg.status} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                              {new Date(pkg.submittedAt || pkg.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                              <Link to={`/package/${pkg.id}`} className="text-blue-600 hover:text-blue-800 mr-3">
                                <ExternalLink className="h-4 w-4 inline" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {!showAllPackages && dispatchedPackages.length > 10 && (
                    <div className="text-center mt-4">
                      <button 
                        onClick={() => setShowAllPackages(true)}
                        className="px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
                      >
                        View All {dispatchedPackages.length} Dispatched Packages
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Returnable Packages Section */}
            <div id="returnable-packages-section" ref={returnableRef} className="bg-white shadow-sm rounded-lg p-6 relative overflow-hidden mb-6">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <RotateCcw className="h-6 w-6 text-indigo-600 mr-2" />
                  <h2 className="text-xl font-semibold text-slate-800">Returnable Packages</h2>
                </div>
                <button
                  onClick={() => setShowAllPackages(!showAllPackages)}
                  className={`flex items-center px-4 py-2 rounded-md ${showAllPackages ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
                >
                  {showAllPackages ? 'Show Recent' : 'View All'}
                </button>
              </div>
              
              {/* Return Status Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg relative overflow-hidden shadow-sm">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500"></div>
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-yellow-500"></div>
                  <div className="flex items-center">
                    <div className="p-3 bg-yellow-100 rounded-full mr-4">
                      <Clock className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">Waiting to Return</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {returnablePackages.filter(pkg => {
                          const status = pkg.returnStatus || pkg.return_status;
                          // Count as waiting if:
                          // 1. No return status AND package is dispatched, OR
                          // 2. Has a status that's not 'returned'
                          return (!status && pkg.status === 'dispatched') || status !== 'returned';
                        }).length}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg relative overflow-hidden shadow-sm">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-green-500"></div>
                  <div className="flex items-center">
                    <div className="p-3 bg-green-100 rounded-full mr-4">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">Returned</p>
                      <p className="text-2xl font-bold text-green-600">
                        {returnablePackages.filter(pkg => {
                          const status = pkg.returnStatus || pkg.return_status;
                          // Count as returned if:
                          // 1. Has a status of 'returned', OR
                          // 2. Has a return date in the past and no explicit status
                          
                          const hasReturnDate = pkg.returnDate || pkg.return_date;
                          
                          const returnDate = hasReturnDate ? new Date(hasReturnDate) : null;
                          const isPastReturnDate = returnDate && returnDate < new Date();
                          
                          return status === 'returned' || (isPastReturnDate && (!status || status === 'pending'));
                        }).length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {returnablePackages.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-6 relative overflow-hidden text-center">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-200"></div>
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-indigo-200"></div>
                  <p className="text-slate-600">No returnable packages found</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tracking #</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Return Date</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {(showAllPackages ? returnablePackages : returnablePackages.slice(0, 5)).map(pkg => (
                        <tr key={pkg.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="text-sm font-medium text-slate-900">{pkg.trackingNumber || pkg.tracking_number}</div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="text-sm text-slate-900">{pkg.items?.[0]?.description || 'N/A'}</div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="text-sm text-slate-900">
                              {(() => {
                                const returnDate = pkg.returnDate || pkg.return_date;
                                console.log('Package return date debug:', {
                                  id: pkg.id,
                                  returnDate: pkg.returnDate,
                                  return_date: pkg.return_date,
                                  is_returnable: pkg.is_returnable,
                                  isReturnable: pkg.isReturnable,
                                  allKeys: Object.keys(pkg)
                                });
                                return returnDate ? new Date(returnDate).toLocaleDateString() : 'N/A';
                              })()}
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span 
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                (pkg.returnStatus || pkg.return_status) === 'returned' 
                                  ? 'bg-green-100 text-green-800'    // Green for returned
                                  : (pkg.returnStatus || pkg.return_status) === 'overdue'
                                  ? 'bg-red-100 text-red-800'        // Red for overdue
                                  : 'bg-yellow-100 text-yellow-800'  // Yellow for pending (default)
                              }`}
                            >
                              {(pkg.returnStatus || pkg.return_status || 'pending').charAt(0).toUpperCase() + (pkg.returnStatus || pkg.return_status || 'pending').slice(1)}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <button
                              onClick={() => navigate(`/package/${pkg.id}`)}
                              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition text-sm"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <footer className="bg-white border-t border-slate-200 py-4">
        <div className="container mx-auto px-4 text-center text-sm text-slate-600">
          DeliverySafe © 2025 | Package Approval System
        </div>
      </footer>
    </div>
  );
};

export default EmployeePage;