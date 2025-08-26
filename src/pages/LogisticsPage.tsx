import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePackages } from '../context/PackageContext';
import { authService } from '../services/authService';
import Navbar from '../components/common/Navbar';
import StatusBadge from '../components/common/StatusBadge';
import { 
  Truck, 
  Package, 
  Search, 
  Filter, 
  RefreshCw, 
  Save, 
  AlertCircle,
  CheckCircle,
  Clock,
  Scale,
  ExternalLink,
  ImageIcon,
  ChevronDown
} from 'lucide-react';
import { toast } from 'react-toastify';

const LogisticsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { packages, refreshData } = usePackages();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('logistics_pending');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [showLogisticsForm, setShowLogisticsForm] = useState(false);
  const [showAllSubmitted, setShowAllSubmitted] = useState(false);
  const [showAllApproved, setShowAllApproved] = useState(false);
  const [showAllDispatched, setShowAllDispatched] = useState(false);
  
  // Define the item type
  interface LogisticsItem {
    id: number;
    weight: string;
    weightUnit: string;
    dimensions: string;
  }

  // Define the form data type
  interface LogisticsFormData {
    courierCompany: string;
    courierTrackingNumber: string;
    items: LogisticsItem[];
    notes: string;
  }

  // Logistics form data
  const [logisticsData, setLogisticsData] = useState<LogisticsFormData>({
    courierCompany: '',
    courierTrackingNumber: '',
    items: [{
      id: 1,
      weight: '',
      weightUnit: 'kg',
      dimensions: ''
    }],
    notes: ''
  });

  // Add a new item row
  const addItem = () => {
    setLogisticsData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: prev.items.length + 1,
          weight: '',
          weightUnit: 'kg',
          dimensions: ''
        }
      ]
    }));
  };

  // Remove an item row
  const removeItem = (id: number) => {
    if (logisticsData.items.length > 1) {
      setLogisticsData(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== id)
      }));
    }
  };

  // Handle input change for item fields
  const handleItemChange = (id: number, field: string, value: string) => {
    setLogisticsData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageAfterPacking, setImageAfterPacking] = useState<File[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/');
    } else if (user.role !== 'logistics') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  if (!user || user.role !== 'logistics') return null;

  // Get packages that need logistics processing (packages with status 'logistics_pending' or 'submitted' with courier transport)
  const logisticsPackages = packages.filter(pkg => {
    const matchesSearch = searchQuery === '' || 
      pkg.trackingNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pkg.recipient?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pkg.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Show packages that are either:
    // 1. In 'logistics_pending' status, or
    // 2. In 'submitted' status with courier transport
    const needsLogisticsProcessing = 
      pkg.status === 'logistics_pending' || 
      (pkg.status === 'submitted' && pkg.transportationType === 'courier');
    
    // If a status filter is applied, only show packages that match the filter
    if (statusFilter && statusFilter !== 'all') {
      return pkg.status === statusFilter && matchesSearch;
    }
    
    // Otherwise, show all packages that need logistics processing
    return needsLogisticsProcessing && matchesSearch;
  });

  const handleRefresh = () => {
    if (refreshData) {
      setIsRefreshing(true);
      refreshData().finally(() => {
        setTimeout(() => setIsRefreshing(false), 500);
      });
    }
  };

  const handlePackageSelect = (pkg: any) => {
    setSelectedPackage(pkg);
    setLogisticsData({
      courierCompany: pkg.courierName || pkg.courier_name || '',
      courierTrackingNumber: pkg.courierTrackingNumber || pkg.courier_tracking_number || '',
      items: [{
        id: 1,
        weight: pkg.weight || '',
        weightUnit: pkg.weightUnit || pkg.weight_unit || 'kg',
        dimensions: pkg.dimensions || ''
      }],
      notes: pkg.notes || ''
    });
    setImageAfterPacking([]);
    setShowLogisticsForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage) return;

    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      const firstItem = logisticsData.items[0];
      
      // Add required courier information
      formData.append('courier_name', logisticsData.courierCompany || 'Unknown Courier');
      if (logisticsData.courierTrackingNumber) {
        formData.append('courier_tracking_number', logisticsData.courierTrackingNumber);
      }
      
      // Add all items as dimensions array
      const dimensionsData = logisticsData.items
        .filter(item => item.weight || item.dimensions)
        .map(item => ({
          weight: item.weight || null,
          weight_unit: item.weightUnit || 'kg',
          dimension: item.dimensions || null,
          purpose: item.id === 1 ? 'main' : `item_${item.id}`
        }));
      
      if (dimensionsData.length > 0) {
        formData.append('dimensions', JSON.stringify(dimensionsData));
      }
      
      formData.append('notes', logisticsData.notes || '');
      formData.append('logistics_processed', 'true');
      formData.append('processed_by_logistics', user?.id?.toString() || '');
      
      // Add image after packing files
      if (imageAfterPacking && imageAfterPacking.length > 0) {
        imageAfterPacking.forEach(file => formData.append('image_after_packing', file));
      }

      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const response = await fetch(`/api/packages/${selectedPackage.id}/logistics`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type header - let the browser set it with the correct boundary
        },
        credentials: 'include', // Include cookies if using session-based auth
        body: formData
      });

      // Log response details for debugging
      console.log('Logistics update response status:', response.status);
      const responseData = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        console.error('Error response data:', responseData);
        throw new Error(responseData.detail || responseData.message || 'Failed to update logistics information');
      }
      
      // Log successful response for debugging
      console.log('Logistics update successful:', responseData);

      toast.success('Logistics information updated successfully');
      setShowLogisticsForm(false);
      setSelectedPackage(null);
      setImageAfterPacking([]);
      handleRefresh();
    } catch (error) {
      console.error('Error updating logistics:', error);
      toast.error('Failed to update logistics information');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setLogisticsData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 flex-grow">
        <header className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-3">
              <Truck className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Logistics Management</h1>
                <p className="text-slate-600">Process courier and package information before manager approval</p>
              </div>
            </div>
            
            <button
              onClick={handleRefresh}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-md flex items-center"
              title="Refresh packages"
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search packages..."
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="submitted">Submitted (Courier)</option>
                  <option value="all">All Packages</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="dispatched">Dispatched</option>
                </select>
              </div>
            </div>
          </div>
        </header>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full mr-4">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Pending Logistics</p>
                <p className="text-2xl font-bold text-blue-600">
                  {packages.filter(p => p.status === 'logistics_pending').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full mr-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Submitted</p>
                <p className="text-2xl font-bold text-green-600">
                  {packages.filter(p => p.status === 'submitted').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-full mr-4">
                <Truck className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Approved by Manager</p>
                <p className="text-2xl font-bold text-purple-600">
                  {packages.filter(p => p.status === 'approved').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-full mr-4">
                <Package className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Dispatched Packages</p>
                <p className="text-2xl font-bold text-orange-600">
                  {packages.filter(p => p.status === 'dispatched').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Packages Table */}
        <div className="bg-white shadow-sm rounded-lg border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">
              Packages Requiring Logistics Processing
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {logisticsPackages.length} packages found
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Tracking #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Recipient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Transport
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Courier Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {logisticsPackages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {pkg.trackingNumber || pkg.tracking_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {pkg.recipient}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={pkg.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        pkg.transportationType === 'courier' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {pkg.transportationType === 'courier' ? 'Courier' : 'Courier'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      <div>
                        <div className="font-medium">
                          {pkg.courierName || pkg.courier_name || 'Not set'}
                        </div>
                        <div className="text-slate-500">
                          {pkg.courierTrackingNumber || pkg.courier_tracking_number || 'No tracking'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handlePackageSelect(pkg)}
                          className="text-blue-600 hover:text-blue-800 flex items-center"
                          title="Process Logistics"
                        >
                          <Scale className="h-4 w-4 mr-1" />
                          Update Courier Details
                        </button>
                        <button
                          onClick={() => navigate(`/package/${pkg.id}`)}
                          className="text-gray-600 hover:text-gray-800"
                          title="View Details"
                        >
                         
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {logisticsPackages.length === 0 && (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No packages found matching your criteria</p>
              </div>
            )}
          </div>
        </div>

        {/* Submitted Packages Table */}
        <div className="mt-8 bg-white shadow-sm rounded-lg border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  Submitted Packages
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  {packages.filter(p => p.status === 'submitted').length} packages found
                </p>
              </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Tracking #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Recipient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Transport
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Courier Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {packages
                  .filter(pkg => pkg.status === 'submitted')
                  .slice(0, showAllSubmitted ? undefined : 5)
                  .map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {pkg.trackingNumber || pkg.tracking_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {pkg.recipient}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={pkg.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        pkg.transportationType === 'courier' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {pkg.transportationType === 'courier' ? 'Courier' : pkg.transportationType || 'Not Set'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      <div>
                        <div className="font-medium">
                          {pkg.courierName || pkg.courier_name || 'Not set'}
                        </div>
                        <div className="text-slate-500">
                          {pkg.courierTrackingNumber || pkg.courier_tracking_number || 'No tracking'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {pkg.transportationType === 'courier' && !pkg.logistics_processed ? (
                          <button
                            onClick={() => handlePackageSelect(pkg)}
                            className="text-blue-600 hover:text-blue-800 flex items-center"
                            title="Process Logistics"
                          >
                            <Scale className="h-4 w-4 mr-1" />
                            Process
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate(`/package/${pkg.id}`)}
                            className="text-blue-600 hover:text-blue-800 flex items-center"
                            title="View Details"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/package/${pkg.id}`)}
                          className="text-gray-600 hover:text-gray-800"
                          title="View Details"
                        >
                          
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {packages.filter(p => p.status === 'submitted').length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No submitted packages found</p>
              </div>
            ) : packages.filter(p => p.status === 'submitted').length > 5 && (
              <div className="px-6 py-4 border-t border-slate-200 text-center">
                <button
                  onClick={() => setShowAllSubmitted(!showAllSubmitted)}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center justify-center w-full py-2"
                >
                  {showAllSubmitted ? 'Show Less' : `View All ${packages.filter(p => p.status === 'submitted').length} Packages`}
                  <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${showAllSubmitted ? 'transform rotate-180' : ''}`} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Approved Packages Table */}
        <div className="mt-8 bg-white shadow-sm rounded-lg border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  Approved Packages
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  {packages.filter(p => p.status === 'approved').length} packages found
                </p>
              </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Tracking #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Recipient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Transport
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Courier Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {packages
                  .filter(pkg => pkg.status === 'approved')
                  .slice(0, showAllApproved ? undefined : 5)
                  .map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {pkg.trackingNumber || pkg.tracking_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {pkg.recipient}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={pkg.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        pkg.transportationType === 'courier' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {pkg.transportationType === 'courier' ? 'Courier' : pkg.transportationType || 'Not Set'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      <div>
                        <div className="font-medium">
                          {pkg.courierName || pkg.courier_name || 'Not set'}
                        </div>
                        <div className="text-slate-500">
                          {pkg.courierTrackingNumber || pkg.courier_tracking_number || 'No tracking'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => navigate(`/package/${pkg.id}`)}
                          className="text-green-600 hover:text-green-800 flex items-center"
                          title="View Details"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          View
                        </button>
                        <button
                          onClick={() => navigate(`/package/${pkg.id}`)}
                          className="text-gray-600 hover:text-gray-800"
                          title="View Full Details"
                        >
                          
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {packages.filter(p => p.status === 'approved').length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No approved packages found</p>
              </div>
            ) : packages.filter(p => p.status === 'approved').length > 5 && (
              <div className="px-6 py-4 border-t border-slate-200 text-center">
                <button
                  onClick={() => setShowAllApproved(!showAllApproved)}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center justify-center w-full py-2"
                >
                  {showAllApproved ? 'Show Less' : `View All ${packages.filter(p => p.status === 'approved').length} Packages`}
                  <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${showAllApproved ? 'transform rotate-180' : ''}`} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dispatched Packages Table */}
        <div className="mt-8 bg-white shadow-sm rounded-lg border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  Dispatched Packages
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  {packages.filter(p => p.status === 'dispatched').length} packages found
                </p>
              </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Tracking #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Recipient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Transport
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Courier Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {packages
                  .filter(pkg => pkg.status === 'dispatched')
                  .slice(0, showAllDispatched ? undefined : 5)
                  .map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {pkg.trackingNumber || pkg.tracking_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {pkg.recipient}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={pkg.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        pkg.transportationType === 'courier' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {pkg.transportationType === 'courier' ? 'Courier' : pkg.transportationType || 'Not Set'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      <div>
                        <div className="font-medium">
                          {pkg.courierName || pkg.courier_name || 'Not set'}
                        </div>
                        <div className="text-slate-500">
                          {pkg.courierTrackingNumber || pkg.courier_tracking_number || 'No tracking'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => navigate(`/package/${pkg.id}`)}
                          className="text-blue-600 hover:text-blue-800 flex items-center"
                          title="View Details"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View
                        </button>
                        <button
                          onClick={() => navigate(`/package/${pkg.id}`)}
                          className="text-gray-600 hover:text-gray-800"
                          title="View Full Details"
                        >
                         
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {packages.filter(p => p.status === 'dispatched').length === 0 ? (
              <div className="text-center py-12">
                <Truck className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No dispatched packages found</p>
              </div>
            ) : packages.filter(p => p.status === 'dispatched').length > 5 && (
              <div className="px-6 py-4 border-t border-slate-200 text-center">
                <button
                  onClick={() => setShowAllDispatched(!showAllDispatched)}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center justify-center w-full py-2"
                >
                  {showAllDispatched ? 'Show Less' : `View All ${packages.filter(p => p.status === 'dispatched').length} Packages`}
                  <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${showAllDispatched ? 'transform rotate-180' : ''}`} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logistics Form Modal */}
      {showLogisticsForm && selectedPackage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-slate-800">
                  Process Logistics - {selectedPackage.trackingNumber}
                </h3>
                <button
                  onClick={() => setShowLogisticsForm(false)}
                  className="text-slate-400 hover:text-white text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-400 transition-colors"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Package Info */}
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                  <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                    <Package className="h-5 w-5 mr-2 text-blue-500" />
                    Package Information
                  </h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-start">
                          <span className="w-32 text-slate-600 font-medium">Consignee Name:</span>
                          <span className="font-medium text-slate-900">{selectedPackage.recipient || 'N/A'}</span>
                        </div>
                        <div className="flex items-start">
                          <span className="w-32 text-slate-600 font-medium">Project Code:</span>
                          <span className="font-medium text-slate-900">{selectedPackage.projectCode || 'N/A'}</span>
                        </div>
                        <div className="flex items-start">
                          <span className="w-32 text-slate-600 font-medium">Status:</span>
                          <div className="flex-1">
                            <StatusBadge status={selectedPackage.status} />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-start">
                          <span className="w-32 text-slate-600 font-medium">Remarks:</span>
                          <span className="font-medium text-slate-900 flex-1">{selectedPackage.remarks || 'N/A'}</span>
                        </div>
                        {selectedPackage.assignedManager && (
                          <div className="flex items-start">
                            <span className="w-32 text-slate-600 font-medium">Manager:</span>
                            <div className="flex-1">
                              <div className="flex items-center">
                                <span className="font-medium text-slate-900">
                                  {selectedPackage.assignedManager.fullName || 
                                  selectedPackage.assignedManager.email || 
                                  'Not Assigned'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    </div>
                    <div className="space-y-3">
                      {/* Item Details */}
                      <div className="mt-4">
                        <h4 className="font-medium text-slate-800 mb-2 flex items-center">
                          <Package className="h-5 w-5 mr-2 text-blue-500" />
                          Item Details
                        </h4>
                        {selectedPackage.items && selectedPackage.items.length > 0 ? (
                          <div className="bg-white p-4 rounded-lg border border-slate-200">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-semibold text-slate-900">Description:</span>
                                <span className="ml-2">{selectedPackage.items[0].description || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-slate-900">Quantity:</span>
                                <span className="ml-2">{selectedPackage.items[0].quantity || '1'}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-slate-900">Serial Number:</span>
                                <span className="ml-2">{selectedPackage.items[0].serial_number || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-slate-900">HSN Code:</span>
                                <span className="ml-2">{selectedPackage.items[0].hsn_code || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-slate-900">Unit Price:</span>
                                <span className="ml-2">{selectedPackage.items[0].unit_price ? `$${selectedPackage.items[0].unit_price}` : 'N/A'}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-slate-900">Total Value:</span>
                                <span className="ml-2">
                                  {selectedPackage.items[0].value ? `$${selectedPackage.items[0].value}` : 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-slate-500">
                            No item details available
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                

               

                {/* Courier Information */}
                <div>
                  <h4 className="font-medium text-slate-800 mb-4 flex items-center">
                    <Truck className="h-5 w-5 mr-2 text-blue-600" />
                    Courier Information
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Courier Company Name *
                      </label>
                      <input
                        type="text"
                        name="courierCompany"
                        value={logisticsData.courierCompany}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., FedEx, DHL, Blue Dart"
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Courier Tracking Number
                      </label>
                      <input
                        type="text"
                        name="courierTrackingNumber"
                        value={logisticsData.courierTrackingNumber}
                        onChange={handleInputChange}
                        placeholder="e.g., 123456789 (Optional)"
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Package & Weight Info */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium text-slate-800 flex items-center">
                      <Scale className="h-5 w-5 mr-2 text-blue-600" />
                      Package & Weight Information
                    </h4>
                    <button
                      type="button"
                      onClick={addItem}
                      className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-800 rounded-full flex items-center text-sm font-medium border border-green-200"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1">
                        <path d="M5 12h14"></path>
                        <path d="M12 5v14"></path>
                      </svg>
                      Add Item
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {logisticsData.items.map((item, index) => (
                      <div key={item.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-slate-200 rounded-lg relative">
                        <div className="absolute top-2 right-2">
                          {logisticsData.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
                              title="Remove item"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                <path d="M3 6h18"></path>
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                              </svg>
                            </button>
                          )}
                        </div>
                        <h5 className="text-sm font-medium text-slate-700 col-span-full">
                          Item {index + 1}
                        </h5>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Weight
                          </label>
                          <input
                            type="text"
                            value={item.weight}
                            onChange={(e) => handleItemChange(item.id, 'weight', e.target.value)}
                            placeholder="e.g., 5.5"
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Weight Unit
                          </label>
                          <select
                            value={item.weightUnit}
                            onChange={(e) => handleItemChange(item.id, 'weightUnit', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                            <option value="lb">lb</option>
                          </select>
                        </div>

                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Dimensions (L×W×H)
                          </label>
                          <input
                            type="text"
                            value={item.dimensions}
                            onChange={(e) => handleItemChange(item.id, 'dimensions', e.target.value)}
                            placeholder="e.g., 10×20×30 cm"
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    ))}

                  </div>
                </div>

                {/* Image After Packing */}
                <div>
                  <h4 className="font-medium text-slate-800 mb-4 flex items-center">
                    <ImageIcon className="h-5 w-5 mr-2 text-blue-600" />
                    Image After Packing
                  </h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Upload Image After Packing (JPG, JPEG, PNG)
                    </label>
                    <input
                      type="file"
                      name="imageAfterPacking"
                      accept="image/*"
                      multiple
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {imageAfterPacking.length > 0 && (
                      <p className='text-xs text-slate-500 mt-1'>
                        Selected: {imageAfterPacking.map(file => file.name).join(', ')}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      Upload images showing the package after it has been packed and ready for dispatch.
                    </p>
                  </div>
                </div>

                {/* Additional Notes */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Additional Notes
                  </label>
                  <textarea
                    name="notes"
                    value={logisticsData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Any additional logistics notes..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowLogisticsForm(false)}
                    className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Logistics Info
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogisticsPage;