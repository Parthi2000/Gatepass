import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { usePackages } from '../context/PackageContext';
import Navbar from '../components/common/Navbar';
import BarcodeScanner from '../components/barcode/BarcodeScanner';
import VerificationCard from '../components/security/VerificationCard';
import { Package, QrCode, Search, FileCheck, Truck, CheckCircle, Clock, RotateCcw } from 'lucide-react';
import type { Package as PackageType } from '../types/index';
import { formatDate } from '../utils/helpers';



const SecurityPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { packages, updatePackageStatus } = usePackages();
  const [showAllReturnable, setShowAllReturnable] = useState(false);

  const [searchQuery, setSearchQuery] = useState(
    location.state?.searchQuery || ''
  );
  const [manualFilteredPackages, setManualFilteredPackages] = useState<PackageType[]>([]);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scannedPackage, setScannedPackage] = useState<any | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showAllPackages, setShowAllPackages] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeTimerRef = useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (!user) {
      navigate('/');
    } else if (user.role !== 'security') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Handle global barcode scanning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if Enter key is pressed (barcode scanners typically end with Enter)
      if (e.key === 'Enter' && barcodeInput) {
        handleBarcodeScan(barcodeInput);
        setBarcodeInput('');
      } else if (e.key.length === 1) { // Only process single character keys
        setBarcodeInput(prev => prev + e.key);
        
        // Reset the barcode input after a short delay (in case of manual typing)
        if (barcodeTimerRef.current) {
          clearTimeout(barcodeTimerRef.current);
        }
        barcodeTimerRef.current = setTimeout(() => {
          setBarcodeInput('');
        }, 500);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (barcodeTimerRef.current) {
        clearTimeout(barcodeTimerRef.current);
      }
    };
  }, [barcodeInput]);

  const handleBarcodeScan = async (barcode: string) => {
    const cleanBarcode = barcode.trim().toUpperCase();
    
    // First check local packages
    const found = packages.find(pkg => {
      const trackingNum = pkg.tracking_number || (pkg as any).tracking_number || pkg.trackingNumber;
      return trackingNum === cleanBarcode;
    });
  
    if (found) {
      navigate(`/package/${found.id}`, { 
        state: { 
          fromScanner: true,
          packageData: found
        } 
      });
      return;
    }
  
    // If not found locally, try to fetch from API
    try {
      setScanError(null); // Clear any previous errors
      
      // Fetch package by tracking number
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/packages/tracking/${encodeURIComponent(cleanBarcode)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.id) {
          navigate(`/package/${data.id}`, {
            state: {
              fromScanner: true,
              packageData: data
            }
          });
          return;
        }
      }
      
      // If we get here, package was not found
      setScanError(`No package found with tracking number: ${cleanBarcode}`);
      setTimeout(() => setScanError(null), 3000);
    } catch (error) {
      console.error('Error fetching package:', error);
      setScanError('Error fetching package details. Please try again.');
      setTimeout(() => setScanError(null), 3000);
    }
  };
  // Handle manual search by tracking number
  useEffect(() => {
    const searchPackages = async () => {
      if (!searchQuery || searchQuery.trim() === '') {
        setManualFilteredPackages([]);
        return;
      }

      const query = searchQuery.trim().toLowerCase();
      
      try {
        // First check local packages
        const localResults = packages.filter(pkg => {
          const trackingNum = (pkg.trackingNumber || pkg.tracking_number || '').toLowerCase();
          return trackingNum.includes(query);
        });

        // If not found locally, you could add an API call here to search the backend
        // This is a placeholder for potential future implementation
        // if (localResults.length === 0) {
        //   const apiResults = await packageService.searchPackages(query);
        //   setManualFilteredPackages(apiResults);
        // } else {
          setManualFilteredPackages(localResults);
        // }

        // Clear any previous errors
        setScanError(null);
      } catch (error) {
        console.error('Error searching packages:', error);
        setScanError('An error occurred while searching for packages');
        setManualFilteredPackages([]);
      }
    };

    // Add a small debounce to prevent too many re-renders
    const debounceTimer = setTimeout(() => {
      searchPackages();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, packages]);

  if (!user || user.role !== 'security') return null;

  // Get approved packages - handle both naming conventions
  const approvedPackages = packages.filter(pkg => {
    const status = pkg.status || (pkg as any).status;
    console.log('Security filtering package:', pkg);
    return status === 'approved';
  });

  // Apply limit to approved packages
  const limitedApprovedPackages = showAllPackages || approvedPackages.length <= 10
    ? approvedPackages
    : approvedPackages.slice(0, 10);

  // Filter packages that have been dispatched
  const dispatchedPackages = packages
    .filter(pkg => pkg.dispatched_at || pkg.dispatchedAt || pkg.status === 'dispatched')
    .sort((a, b) => {
      const dateA = a.dispatched_at || a.dispatchedAt || 0;
      const dateB = b.dispatched_at || b.dispatchedAt || 0;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

  // Filter returnable packages - show packages that are marked as returnable and have been dispatched
  const returnablePackages = packages.filter(pkg => {
    const isMarkedReturnable = pkg.isReturnable || pkg.is_returnable || false;
    const isDispatched = pkg.dispatched_at || pkg.dispatchedAt || pkg.status === 'dispatched';
    
    // Debug logging
    console.log('Package returnable status:', {
      id: pkg.id,
      trackingNumber: pkg.tracking_number || pkg.trackingNumber,
      isReturnable: isMarkedReturnable,
      isDispatched: isDispatched,
      status: pkg.status || pkg.status
    });
    
    // A package is returnable if it's explicitly marked as returnable and has been dispatched
    return isMarkedReturnable === true && isDispatched;
  });
  
  // Filter pending return packages - include dispatched packages that are marked as returnable and not returned
  const pendingReturnPackages = packages.filter(pkg => {
    const isMarkedReturnable = pkg.isReturnable || pkg.is_returnable || false;
    const isDispatched = pkg.dispatched_at || pkg.dispatchedAt || pkg.status === 'dispatched';
    const status = pkg.returnStatus || pkg.return_status || '';
    const isReturned = status.toString().toLowerCase().includes('returned');
    
    // Debug logging
    console.log('Pending return check:', {
      id: pkg.id,
      trackingNumber: pkg.tracking_number || pkg.trackingNumber,
      isReturnable: isMarkedReturnable,
      isDispatched: isDispatched,
      returnStatus: status,
      isReturned: isReturned
    });
    
    // A package is pending return if:
    // 1. It's explicitly marked as returnable, AND
    // 2. It has been dispatched, AND
    // 3. It's not marked as returned
    return isMarkedReturnable === true && isDispatched && !isReturned;
  });
  
  // Filter returned packages - include all packages with status 'returned' regardless of other conditions
  const returnedPackages = packages.filter(pkg => {
    const status = pkg.returnStatus || pkg.return_status;
    const hasReturnDate = pkg.returnDate || pkg.return_date;
    const returnDate = hasReturnDate ? new Date(hasReturnDate) : null;
    const isPastReturnDate = returnDate && returnDate < new Date();
    
    // A package is considered returned if:
    // 1. It's explicitly marked as 'returned', OR
    // 2. It has a return date in the past and no explicit status, OR
    // 3. It has a status containing 'return' (case insensitive)
    return (
      status === 'returned' || 
      (isPastReturnDate && (!status || status === 'pending')) ||
      (status && status.toString().toLowerCase().includes('return'))
    );
  });
  
  console.log('Package return stats:', {
    totalPackages: packages.length,
    returnablePackages: returnablePackages.length,
    pendingReturnPackages: pendingReturnPackages.length,
    returnedPackages: returnedPackages.length
  });

  // Limit the number of dispatched packages shown
  const limitedDispatchedPackages = showAllPackages
    ? dispatchedPackages
    : dispatchedPackages.slice(0, 5);

    const handleDispatch = async (id: string, notes: string) => {
      try {
        console.log('Dispatching package with ID:', id);
        console.log('All packages:', packages);
        
        const pkgToDispatch = packages.find(pkg => pkg.id === id);
        console.log('Found package:', pkgToDispatch);
        
        if (!pkgToDispatch) {
          console.error('Package not found in local state');
          toast.error('Package data not found. Please refresh and try again.');
          return;
        }
        
        const trackingNumber = pkgToDispatch.tracking_number || pkgToDispatch.trackingNumber;
        console.log('Using tracking number:', trackingNumber);
        
        if (!trackingNumber) {
          console.error('No tracking number found for package:', pkgToDispatch);
          toast.error('This package has no tracking number');
          return;
        }
        
        // Update the package status
        const response = await updatePackageStatus(id, 'dispatched', notes);
        console.log('Update response:', response);
        
        // Update UI state
        setScannedPackage(null);
        setScanResult(null);
        setSearchQuery('');
        
        // Remove the dispatched package from the manual search results
        setManualFilteredPackages(prev => prev.filter(pkg => pkg.id !== id));
        
        // Show success message
        toast.success(`Package ${trackingNumber} has been successfully dispatched!`, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        
      } catch (error: unknown) {
        console.error('Error in handleDispatch:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to dispatch package';
        toast.error(errorMessage);
      }
    };

  // Function to fetch manager name for a package
  const fetchManagerName = async (managerId: string | number) => {
    if (!managerId) return "No manager assigned";

    try {
      const response = await fetch(`/api/users/${managerId}`);
      if (!response.ok) {
        console.error(`Error fetching manager with ID ${managerId}:`, response.statusText);
        return "Manager information unavailable";
      }

      const manager = await response.json();
      return manager.name || "Unknown Manager";
    } catch (error) {
      console.error(`Error fetching manager with ID ${managerId}:`, error);
      return "Manager information unavailable";
    }
  };

  const handleScan = async (result: string) => {
    setScanResult(result);
    console.log('Scanning for package with tracking number:', result);
    console.log('Available packages:', packages);

    // Find package with this tracking number - handle both naming conventions
    const found = packages.find(pkg => {
      // Get tracking number, checking both naming conventions
      const trackingNum = pkg.trackingNumber || (pkg as any).tracking_number;
      // Get status, checking both naming conventions
      const status = pkg.status || (pkg as any).status;

      console.log('Checking package:', pkg);
      console.log('Package tracking number:', trackingNum, 'Result:', result);
      console.log('Package status:', status);

      return trackingNum === result && status === 'approved';
    });

    if (found) {
      // Get the manager ID from the package
      const managerId = found.assignedToManager || (found as any).assigned_to_manager;

      if (managerId) {
        // Fetch the manager's name
        const managerName = await fetchManagerName(managerId);

        // Add the manager name to the package data
        setScannedPackage({
          ...found,
          assignedToManagerName: managerName
        });
      } else {
        setScannedPackage(found);
      }

      setScanError(null);
    } else {
      setScannedPackage(null);
      setScanError(`No approved package found with tracking number: ${result}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <div className="container mx-auto px-4 py-8 flex-grow">
        <header className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-slate-800">Security Dashboard</h1>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowAllPackages(!showAllPackages)}
                className={`flex items-center px-4 py-2 rounded-md ${showAllPackages ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
              >
                {showAllPackages ? 'Show Recent' : 'View All'}
              </button>
              <button
                onClick={() => setShowScanner(!showScanner)}
                className={`flex items-center px-4 py-2 rounded-md ${showScanner ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}
              >
                <QrCode className="h-5 w-5 mr-2" />
                {showScanner ? 'Hide Scanner' : 'Scan Barcode'}
              </button>
            </div>
          </div>
          <p className="text-slate-600">Verify and dispatch approved packages</p>
        </header>

    

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="bg-white shadow-md rounded-lg p-6 border border-slate-200 mb-6">
              <div className="flex items-center mb-4">
                <Search className="h-6 w-6 text-blue-600 mr-2" />
                <h2 className="text-xl font-semibold text-slate-800">Manual Search</h2>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
                  placeholder="Enter tracking number to search"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
              </div>
              {searchQuery && manualFilteredPackages.length === 0 && (
                <p className="text-slate-600 text-center py-4">No packages found with that tracking number</p>
              )}
              {searchQuery && manualFilteredPackages.length > 0 && manualFilteredPackages.map(pkg => (
                <div key={pkg.id} className="mt-4">
                  <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                    <div className="flex items-center mb-2">
                      <FileCheck className="h-5 w-5 text-green-600 mr-2" />
                      <h3 className="text-lg font-semibold text-green-800">Gate Pass Verified</h3>
                    </div>
                    <p className="text-green-700 text-sm">This package has been approved and is ready for dispatch.</p>
                  </div>

                  <h3 className="text-lg font-semibold text-slate-800 mb-3">Package Details:</h3>
                  <VerificationCard
                    pkg={pkg}
                    onDispatch={handleDispatch}
                  />
                </div>
              ))}

              {/* Dispatched Packages Section */}
              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Truck className="h-6 w-6 text-green-600 mr-2" />
                    <h2 className="text-xl font-semibold text-slate-800">Dispatched Packages</h2>
                  </div>
                  {dispatchedPackages.length > 5 && (
                    <button
                      onClick={() => setShowAllPackages(!showAllPackages)}
                      className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      {showAllPackages ? 'Show Less' : 'View All'}
                    </button>
                  )}
                </div>
                {dispatchedPackages.length === 0 ? (
                  <p className="text-slate-600 text-center py-4">No dispatched packages found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tracking #</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Recipient</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Project Code</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Dispatched At</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100">
                        {limitedDispatchedPackages.map(pkg => (
                          <tr key={pkg.id}>
                            <td className="px-4 py-2 whitespace-nowrap font-semibold text-slate-800">{pkg.trackingNumber || pkg.tracking_number}</td>
                            <td className="px-4 py-2 whitespace-nowrap">{pkg.recipient}</td>
                            <td className="px-4 py-2 whitespace-nowrap">{pkg.projectCode || pkg.project_code}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-slate-600">
                              {formatDate(pkg.dispatchedAt || (pkg.dispatched_at ? new Date(pkg.dispatched_at) : undefined))}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <button
                                className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
                                onClick={() => navigate(`/package/${pkg.id}`)}
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
            <div>
              {showScanner && <BarcodeScanner onScan={handleScan} />}

              {scanResult && !scannedPackage && !scanError && (
                <div className="mb-4 p-3 bg-blue-100 border border-blue-200 text-blue-700 rounded-md">
                  Searching for package with tracking number: {scanResult}
                </div>
              )}

              {scanError && (
                <div className="fixed top-4 right-4 z-50 p-4 bg-red-100 border border-red-400 text-red-700 rounded shadow-lg">
                  {scanError}
                </div>
              )}

              {scannedPackage && (
                <div className="mt-4">
                  <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                    <div className="flex items-center mb-2">
                      <FileCheck className="h-5 w-5 text-green-600 mr-2" />
                      <h3 className="text-lg font-semibold text-green-800">Gate Pass Verified</h3>
                    </div>
                    <p className="text-green-700 text-sm">This package has been approved and is ready for dispatch.</p>
                  </div>

                  <h3 className="text-lg font-semibold text-slate-800 mb-3">Package Details:</h3>
                  <VerificationCard
                    pkg={scannedPackage}
                    onDispatch={handleDispatch}
                  />

                 
                  <button
                    className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                    onClick={() => handleDispatch(scannedPackage.id, 'Approved and dispatched by security')}
                  >
                    Approve and Dispatch
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <div className="bg-white shadow-md rounded-lg p-6 border border-slate-200 mb-6">
              <div className="flex items-center mb-4">
                <Package className="h-6 w-6 text-blue-600 mr-2" />
                <h2 className="text-xl font-semibold text-slate-800">Approved Packages Manager</h2>
              </div>
              {approvedPackages.length === 0 ? (
                <p className="text-slate-600 text-center py-4">No approved packages found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tracking #</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Recipient</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">project code</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {limitedApprovedPackages.map(pkg => (
                        <tr key={pkg.id}>
                          <td className="px-4 py-2 whitespace-nowrap font-semibold text-slate-800">{pkg.trackingNumber || pkg.tracking_number}</td>
                          <td className="px-4 py-2 whitespace-nowrap">{pkg.recipient}</td>
                          <td className="px-4 py-2 whitespace-nowrap">{pkg.projectCode || pkg.project_code}</td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <button
                              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
                              onClick={() => navigate(`/package/${pkg.id}`)}
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
          
          
          {/* Returnable Packages Section */}
          <div className="mt-8">
            <div className="bg-white shadow-md rounded-lg p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <RotateCcw className="h-6 w-6 text-indigo-600 mr-2" />
                  <h2 className="text-xl font-semibold text-slate-800">Returnable Packages</h2>
                </div>
                <button
                  onClick={() => setShowAllReturnable(!showAllReturnable)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {showAllReturnable ? 'Show Less' : 'View All'}
                </button>
              </div>
              
              {/* Status Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 shadow-sm">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg mr-4">
                      <Clock className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Pending Return</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {pendingReturnPackages.length}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg border border-green-100 shadow-sm">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg mr-4">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Returned</p>
                      <p className="text-2xl font-bold text-green-600">
                        {returnedPackages.length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {returnablePackages.length === 0 ? (
                <div className="bg-slate-50 rounded-lg p-6 text-center border border-slate-100">
                  <p className="text-slate-500">No returnable packages found</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tracking #</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Return Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {(showAllReturnable ? returnablePackages : returnablePackages.slice(0, 5)).map(pkg => (
                        <tr key={pkg.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-slate-900">
                              {pkg.tracking_number || pkg.trackingNumber || 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-slate-900 line-clamp-1">{pkg.items?.[0].description || 'N/A'}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-slate-700">
                              {(() => {
                                const returnDate = pkg.returnDate || pkg.return_date;
                                if (!returnDate) {
                                  console.log('No return date found for package:', {
                                    id: pkg.id,
                                    trackingNumber: pkg.tracking_number || pkg.trackingNumber,
                                    availableProps: Object.keys(pkg).filter(k => k.includes('return') || k.includes('Return'))
                                  });
                                  return 'N/A';
                                }
                                
                                try {
                                  const dateObj = new Date(returnDate);
                                  if (isNaN(dateObj.getTime())) {
                                    console.error('Invalid date format for package:', {
                                      id: pkg.id,
                                      returnDate,
                                      type: typeof returnDate
                                    });
                                    return 'Invalid Date';
                                  }
                                  return formatDate(dateObj);
                                } catch (error) {
                                  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                                  console.error('Error formatting return date:', {
                                    id: pkg.id,
                                    returnDate,
                                    error: errorMessage
                                  });
                                  return 'Error';
                                }
                              })()}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              (pkg.returnStatus || pkg.return_status || 'pending') === 'returned' 
                                ? 'bg-green-100 text-green-800' 
                                : ((pkg.returnStatus || pkg.return_status) === 'overdue' 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-yellow-100 text-yellow-800')
                            }`}>
                              {(() => {
                                const status = pkg.returnStatus || pkg.return_status || 'pending';
                                return status.charAt(0).toUpperCase() + status.slice(1);
                              })()}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <button
                              onClick={() => navigate(`/package/${pkg.id}`)}
                              className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {!showAllReturnable && returnablePackages.length > 5 && (
                    <div className="px-4 py-3 bg-slate-50 text-right border-t border-slate-100">
                      <button
                        onClick={() => setShowAllReturnable(true)}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        Show all {returnablePackages.length} returnable packages →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
      
      <footer className="bg-white border-t border-slate-200 py-4">
        <div className="container mx-auto px-4 text-center text-sm text-slate-600">
          DeliverySafe 2025 | Package Approval System
        </div>
      </footer>
    </div>
  );
};

export default SecurityPage;