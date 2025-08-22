import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePackages } from '../context/PackageContext';
import { packageService } from '../services/packageService';
import StatusBadge from '../components/common/StatusBadge';
import GatePass from '../components/barcode/GatePass';
import Barcode from 'react-barcode';
import { formatDate } from '../utils/helpers';
import { Package as PackageIcon, ArrowLeft, MapPin, User, Printer, X, Check, Clock, Send, Image, ChevronLeft, ChevronRight, Undo } from 'lucide-react';
import { toast } from 'react-toastify';

// Helper function to get status card styles
const getStatusCardStyles = (status: string): string => {
  switch (status) {
    case 'submitted':
      return 'bg-blue-50 border border-blue-200 text-blue-700';
    case 'approved':
      return 'bg-green-50 border border-green-200 text-green-700';
    case 'rejected':
      return 'bg-red-50 border border-red-200 text-red-700';
    case 'dispatched':
      return 'bg-purple-50 border border-purple-200 text-purple-700';
    default:
      return 'bg-slate-50 border border-slate-200 text-slate-700';
  }
};

const PackageDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { packages, refreshData: refreshPackageData, updatePackageReturnStatus } = usePackages();
  const [isMarkingReturned, setIsMarkingReturned] = useState(false);
  const [pkg, setPkg] = useState<any | null>(null);
  
  // Debug: Log package data when it changes
  useEffect(() => {
    if (pkg) {
      console.log('Package data:', {
        submitted_by_user: pkg.submitted_by_user,
        submitted_by: pkg.submitted_by,
        submittedByName: pkg.submittedByName,
        submitted_by_name: pkg.submitted_by_name,
        allPackageProps: Object.keys(pkg)
      });
    }
  }, [pkg]);
  const [packageImages, setPackageImages] = useState<{
    before: Array<{ id: number; image_path: string; image_type: string }>;
    after: Array<{ id: number; image_path: string; image_type: string }>;
  }>({ before: [], after: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { updatePackageStatus, refreshData } = usePackages();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [showGatePass, setShowGatePass] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnDetails, setReturnDetails] = useState({
    returnedBy: '',
    returnNotes: '',
    returnedDate: new Date().toISOString().split('T')[0],
    returnedTime: new Date().toLocaleTimeString('en-US', { hour12: true })
  });

  // Handle approve and dispatch action

  
  // Handle ESC key to exit page
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      navigate(-1);
    }
  }, [navigate]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Image navigation functions
  const goToNextImage = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % (packageImages?.before.length + packageImages?.after.length));
  }, [packageImages]);

  const goToPreviousImage = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) => {
      const totalImages = packageImages?.before.length + packageImages?.after.length;
      return (prev - 1 + totalImages) % totalImages;
    });
  }, [packageImages]);
  
  // Base64 placeholder image
  const placeholderImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgdmlld0JveD0iMCAwIDgwMCA2MDAiIGZpbGw9IiNlZWVlZWUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjgwMCIgaGVpZ2h0PSI2MDAiIGZpbGw9IiNlZWVlZWIiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSIgZmlsbD0iIzk5OSI+SW1hZ2UgTm90IEF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
  
  // Get image URL with fallback for different path formats
  const getImageUrl = (imagePath: string) => {
    if (!imagePath) {
      console.log('No image path provided, using placeholder');
      return placeholderImage;
    }
    
    // If it's already a full URL or data URL, return as is
    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
      console.log('Returning full URL or data URL directly:', imagePath);
      return imagePath;
    }
    
    // Get base URL from environment variable or use default
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
    
    // Handle different path formats
    let cleanPath = imagePath;
    
    // If the path already includes the base URL, return as is
    if (cleanPath.startsWith(baseUrl)) {
      console.log('Path already includes base URL, returning as is');
      return cleanPath;
    }
    
    // Remove any leading slashes or backslashes to prevent double slashes
    cleanPath = cleanPath.replace(/^[\\/]+/, '');
    
    // If path doesn't start with 'uploads/package_images/', add it
    if (!cleanPath.startsWith('uploads/package_images/') && !cleanPath.startsWith('package_images/')) {
      cleanPath = `uploads/package_images/${cleanPath}`;
    }
    
    // Construct the full URL
    const fullUrl = `${baseUrl}/${cleanPath}`.replace(/([^:]\/)\/+/g, '$1'); // Remove double slashes
    
    console.log('Constructed image URL:', { 
      original: imagePath, 
      clean: cleanPath, 
      full: fullUrl,
      env: import.meta.env.VITE_API_BASE_URL || 'using default localhost:3001'
    });
    
    return fullUrl;
  };

  // Handle keyboard navigation for images
  const handleImageKeyDown = useCallback((event: KeyboardEvent) => {
    if (isImageModalOpen) {
      if (event.key === 'ArrowRight') {
        goToNextImage();
      } else if (event.key === 'ArrowLeft') {
        goToPreviousImage();
      }
    }
  }, [isImageModalOpen, goToNextImage, goToPreviousImage]);

  useEffect(() => {
    if (isImageModalOpen) {
      document.addEventListener('keydown', handleImageKeyDown);
      return () => {
        document.removeEventListener('keydown', handleImageKeyDown);
      };
    }
  }, [isImageModalOpen, handleImageKeyDown]);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    
    if (!id) {
      navigate('/dashboard');
      return;
    }
    
    // Always fetch fresh package data with return information, even if coming from barcode scanner
    // This ensures return information is always up-to-date
    
    setLoading(true);
    
    const fetchPackageWithReturnInfo = async () => {
      try {
        // First try to fetch package with return information from the new endpoint
        const token = localStorage.getItem('token');
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/packages/${id}/with-return`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          console.log('Package with return info:', data);
      console.log('Dimensions data:', data.dimensions);
          
          // Debug log for package items
          if (data.items || data.package_items) {
            console.log('Package items data:', data.items || data.package_items);
            const items = data.items || data.package_items || [];
            items.forEach((item: any, index: number) => {
              console.log(`Item ${index + 1}:`, {
                unit_price: item.unit_price,
                unitPrice: item.unitPrice,
                value: item.value,
                hasUnitPrice: 'unit_price' in item,
                hasUnitPriceCamel: 'unitPrice' in item,
                hasValue: 'value' in item,
                rawItem: item
              });
            });
          }
          
          // Map the response to match the Package type
          const mappedData = {
            ...data,
            // Map return info to the root level for easier access
            returned_by: data.returned_by,
            return_notes: data.return_notes,
            returned_at: data.returned_at,
            return_status: data.return_status,
            isReturnable: data.is_returnable !== undefined ? data.is_returnable : data.isReturnable,
            returnStatus: data.return_status || data.returnStatus,
            // Map other fields as needed
            trackingNumber: data.tracking_number || data.trackingNumber,
            gatePassSerialNumber: data.gate_pass_serial_number || data.gatePassSerialNumber,
            assigned_to_manager: data.assigned_to_manager || data.assignedToManager,
            assignedManager: data.assigned_manager || data.assignedManager,
            assigned_manager_name: data.assigned_manager_name || data.assignedManagerName || (data.assigned_manager ? data.assigned_manager.full_name : undefined),
            // Map items if they exist
            items: data.items || data.package_items || [],
            // Map dimensions if they exist
            dimensions: data.dimensions || [],
            // Map submitted by information
            submittedByName: data.submitted_by_name || data.submittedByName || 
                           (data.submitted_by && data.submitted_by.full_name) ||
                           (data.submitted_by_user && data.submitted_by_user.full_name) ||
                           (data.user && data.user.full_name) ||
                           (data.submitted_by && typeof data.submitted_by === 'string' ? data.submitted_by : undefined),
            submittedAt: data.submitted_at ? new Date(data.submitted_at) : undefined,
            approvedAt: data.approved_at ? new Date(data.approved_at) : undefined,
            dispatchedAt: data.dispatched_at ? new Date(data.dispatched_at) : undefined
          };

          // Debug log for items
          console.log('Package items data:', {
            items: mappedData.items,
            dataItems: data.items,
            dataPackageItems: data.package_items,
            fullData: data
          });
          
          console.log('Mapped package data:', {
            // Manager info
            assigned_to_manager: data.assigned_to_manager,
            assigned_manager_name: data.assigned_manager_name,
            assigned_manager: data.assigned_manager,
            finalAssignedManagerName: mappedData.assignedManagerName,
            // Submitter info
            submitted_by: data.submitted_by,
            submitted_by_name: data.submitted_by_name,
            submitted_by_user: data.submitted_by_user,
            user: data.user,
            finalSubmittedByName: mappedData.submittedByName
          });
          
          setPkg(mappedData);
          
          // Process and set package images if they exist in the response
          if (data.images || data.package_images) {
            const images = data.images || data.package_images || [];
            const beforeImages = images.filter((img: any) => img.image_type === 'before_packing');
            const afterImages = images.filter((img: any) => img.image_type === 'after_packing');
            
            setPackageImages({
              before: beforeImages,
              after: afterImages
            });
          }
          
          return;
        }
        
        // If the new endpoint fails, fall back to the original logic
        console.log('Falling back to original package loading logic...');
        const packageId = id.toString();
        
        // Try to get the package with all weight sections
        let packageData;
        
        try {
          // Try to get package with all weight sections
          const apiResult = await packageService.getPackageWithWeights(packageId);
          packageData = apiResult || undefined;
          
          // If not found, fall back to regular package data
          if (!packageData) {
            packageData = packages.find(p => p.id.toString() === packageId);
          }
        } catch (apiError) {
          console.error('Error fetching package with weights, falling back to regular data:', apiError);
          packageData = packages.find(p => p.id.toString() === packageId);
        }
        
        // If still not found, try refreshing all data as last resort
        if (!packageData && refreshData) {
          await refreshData();
          packageData = packages.find(p => p.id.toString() === packageId);
        }
        
        if (packageData) {
          // Create a new object with the package data and ensure all properties are properly mapped
          const enhancedPackageData: any = {
            ...packageData,
            // Map gate pass serial number
            gate_pass_serial_number: packageData.gate_pass_serial_number || (packageData as any).gatePassSerialNumber,
            gatePassSerialNumber: (packageData as any).gatePassSerialNumber || packageData.gate_pass_serial_number,
            // Map return info using type assertions
            returned_by: (packageData as any).returnedBy || packageData.returned_by,
            return_notes: (packageData as any).returnNotes || (packageData as any).return_notes,
            // Handle returnedAt with type assertion
            returnedAt: (packageData as any).returnedAt || (packageData as any).returned_at,
            // Map status fields
            return_status: (packageData as any).returnStatus || (packageData as any).return_status,
            // Ensure all required fields are present
            returnStatus: (packageData as any).returnStatus || (packageData as any).return_status,
            returnNotes: (packageData as any).returnNotes || (packageData as any).return_notes
          };
          
          // Remove any undefined values to prevent React controlled component warnings
          Object.keys(enhancedPackageData).forEach(key => {
            if (enhancedPackageData[key] === undefined) {
              delete enhancedPackageData[key];
            }
          });
          
          setPkg(enhancedPackageData);
        } else {
          console.error('Package not found after all attempts:', packageId);
        }
      } catch (error) {
        console.error('Error loading package details:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPackageWithReturnInfo();
  }, [id, user, navigate, packages, refreshData]);
  
  useEffect(() => {
    const fetchPackageImages = async () => {
      if (pkg?.id) {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/packages/${pkg.id}/images`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          console.log('Fetched package images:', data);
          
          // Group images by type
          const groupedImages = {
            before: (data.before_packing || []).map((img: any) => ({
              ...img,
              image_path: formatImagePath(img.image_path)
            })),
            after: (data.after_packing || []).map((img: any) => ({
              ...img,
              image_path: formatImagePath(img.image_path)
            }))
          };
          
          console.log('Grouped images:', groupedImages);
          setPackageImages(groupedImages);
        } catch (error) {
          console.error('Error fetching package images:', error);
          // Initialize with empty arrays to prevent undefined errors
          setPackageImages({ before: [], after: [] });
        }
      } else {
        // If no package ID, reset images
        setPackageImages({ before: [], after: [] });
      }
    };

    fetchPackageImages();
  }, [pkg?.id]);

  // Helper function to format image paths
  const formatImagePath = (imagePath: string): string => {
    if (!imagePath) return '';
    return imagePath.startsWith('http') || imagePath.startsWith('/uploads') 
      ? imagePath 
      : `/uploads/package_images/${imagePath.replace(/^.*[\\/]/, '')}`;
  };



  const handleApproveAndDispatch = async () => {
    if (!pkg?.id) return;
    setActionLoading(true);
    try {
      // Use the packageService to update the package status
      await packageService.updatePackageStatus(pkg.id.toString(), 'dispatched', 'Approved and dispatched by security');
      
      // Show success message with tracking number
      const trackingNumber = pkg.tracking_number || pkg.trackingNumber || 'N/A';
      toast.success(`Package ${trackingNumber} has been successfully dispatched!`, {
        position: 'top-right',
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
      
      // Refresh the data and navigate back
      if (refreshData) await refreshData();
      navigate(-1);
    } catch (error) {
      console.error('Error dispatching package:', error);
      toast.error('Failed to dispatch package. Please try again.', {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (!user) return null;
  
  // Show loading indicator while fetching package data
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-800 bg-opacity-75 flex items-center justify-center p-4">
        {/* Modal-like container */}
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-auto relative">
          {/* Close button */}
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors z-10"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
          
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
          </div>
        </div>
      </div>
    );
  }


  
  // Show error state when package isn't found
  if (!pkg) {
    return (
      <div className="min-h-screen bg-slate-800 bg-opacity-75 flex items-center justify-center p-4">
        {/* Modal-like container */}
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-auto relative">
          {/* Close button */}
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors z-10"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
          
          <div className="text-center py-12">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md inline-block mb-4">
              <p>Package not found. It may have been deleted or you don't have permission to view it.</p>
            </div>
            <Link to="/dashboard" className="text-blue-600 hover:underline flex items-center justify-center">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  const renderImagesSection = () => {
    // Handle case when there are no images
    if (!packageImages || (!packageImages.before?.length && !packageImages.after?.length)) {
      return (
        <div className="text-center py-8 text-slate-500">
          <Image className="h-12 w-12 mx-auto mb-3 text-slate-400" />
          <p>No images available for this package</p>
        </div>
      );
    }

    const allImages = [...(packageImages.before || []), ...(packageImages.after || [])];
    const currentImage = allImages[currentImageIndex];

    return (
      <div className="space-y-8">
        {/* Image Modal */}
        {isImageModalOpen && currentImage && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
            onClick={() => setIsImageModalOpen(false)}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Close button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsImageModalOpen(false);
                }}
                className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
              >
                <X className="h-8 w-8" />
              </button>

              {/* Previous button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToPreviousImage();
                }}
                className="absolute left-4 text-white hover:text-gray-300 transition-colors"
              >
                <ChevronLeft className="h-12 w-12" />
              </button>

              {/* Image */}
              <img
                src={getImageUrl(currentImage.image_path)}
                alt={`Package ${currentImage.image_type} image`}
                className="max-h-[90vh] max-w-[90vw] object-contain"
                onClick={(e) => e.stopPropagation()}
              />

              {/* Next button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToNextImage();
                }}
                className="absolute right-4 text-white hover:text-gray-300 transition-colors"
              >
                <ChevronRight className="h-12 w-12" />
              </button>

              {/* Image counter */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white bg-black bg-opacity-50 px-4 py-1 rounded-full">
                {currentImageIndex + 1} / {allImages.length}
              </div>
            </div>
          </div>
        )}

        {/* Combined Images Section */}
        <div className="bg-white p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b-2 border-gray-200 pb-2">
            Package Images
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Before Packing Column */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-700">
                Before Packing
                {packageImages.before?.length > 0 && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({packageImages.before.length} {packageImages.before.length === 1 ? 'image' : 'images'})
                  </span>
                )}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {packageImages.before?.length > 0 ? (
                  packageImages.before.map((image, index) => (
                    <div
                      key={image.id}
                      className="relative group cursor-pointer"
                      onClick={() => {
                        setCurrentImageIndex(index);
                        setIsImageModalOpen(true);
                      }}
                    >
                      <img
                        src={getImageUrl(image.image_path)}
                        alt="Before packing"
                        className="w-full h-48 object-cover rounded-lg transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          console.error('Error loading image:', image.image_path);
                          (e.target as HTMLImageElement).src = placeholderImage;
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-300 rounded-lg flex items-center justify-center">
                        <Image className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-8 text-gray-400">
                    <p>No before packing images</p>
                  </div>
                )}
              </div>
            </div>

            {/* After Packing Column */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-700">
                After Packing
                {packageImages.after?.length > 0 && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({packageImages.after.length} {packageImages.after.length === 1 ? 'image' : 'images'})
                  </span>
                )}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {packageImages.after?.length > 0 ? (
                  packageImages.after.map((image, index) => {
                    const globalIndex = (packageImages.before?.length || 0) + index;
                    return (
                      <div
                        key={image.id}
                        className="relative group cursor-pointer"
                        onClick={() => {
                          setCurrentImageIndex(globalIndex);
                          setIsImageModalOpen(true);
                        }}
                      >
                        <img
                          src={getImageUrl(image.image_path)}
                          alt="After packing"
                          className="w-full h-48 object-cover rounded-lg transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            console.error('Error loading image:', image.image_path);
                            (e.target as HTMLImageElement).src = placeholderImage;
                          }}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-300 rounded-lg flex items-center justify-center">
                          <Image className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-2 text-center py-8 text-gray-400">
                    <p>No after packing images</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-auto relative">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-white/10 rounded-lg">
                <PackageIcon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Package #{pkg?.id}</h1>
                <p className="text-blue-100">{pkg?.trackingNumber || pkg?.tracking_number}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowGatePass(true)}
                className="flex items-center px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Gate Pass
              </button>
              
              {/* Debug logs */}
              {console.log('User role:', user?.role, 'isReturnable:', pkg?.isReturnable, 'returnStatus:', pkg?.returnStatus, 'pkg:', pkg)}
              
              {/* Received By Button - Only show for security users on returnable packages that are approved and dispatched and not yet returned */}
              {user?.role === 'security' && 
               (pkg?.isReturnable || pkg?.is_returnable) && 
               pkg?.status === 'dispatched' && 
               pkg?.returnStatus !== 'returned' && 
               pkg?.return_status !== 'returned' &&
               !pkg?.returned_at && (
                <>
                  <button
                    onClick={() => setShowReturnModal(true)}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    <Undo className="h-4 w-4 mr-2" />
                    Received By
                  </button>

                  {/* Return Details Modal */}
                  {showReturnModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                      <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold">Package Return Details</h3>
                          <button 
                            onClick={() => setShowReturnModal(false)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Returned By <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={returnDetails.returnedBy}
                              onChange={(e) => setReturnDetails(prev => ({...prev, returnedBy: e.target.value}))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-400"
                              placeholder="Enter name of person returning"
                              required
                            />
                          </div>
                          
                        

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Return Submission Date <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="date"
                              value={returnDetails.returnedDate}
                              onChange={(e) => setReturnDetails(prev => ({...prev, returnedDate: e.target.value}))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                              min={new Date().toISOString().split('T')[0]}
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Return Time <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="time"
                              value={returnDetails.returnedTime}
                              onChange={(e) => setReturnDetails(prev => ({...prev, returnedTime: e.target.value}))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Return Notes
                            </label>
                            <textarea
                              value={returnDetails.returnNotes}
                              onChange={(e) => setReturnDetails(prev => ({...prev, returnNotes: e.target.value}))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-400"
                              rows={3}
                              placeholder="Any additional notes about the return"
                            />
                          </div>
                          
                          <div className="flex justify-end space-x-3 pt-4">
                            <button
                              onClick={() => setShowReturnModal(false)}
                              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                              disabled={isMarkingReturned}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={async () => {
                                if (!pkg?.id || !returnDetails.returnedBy.trim() || !returnDetails.returnedDate || !returnDetails.returnedTime) {
                                  toast.error('Please fill in all required fields');
                                  return;
                                }
                                
                                try {
                                  setIsMarkingReturned(true);
                                  
                                  // Format the date and time for the backend
                                  const [hours, minutes] = returnDetails.returnedTime.split(':');
                                  const date = new Date(returnDetails.returnedDate);
                                  date.setHours(parseInt(hours, 10));
                                  date.setMinutes(parseInt(minutes, 10));
                                  
                                  console.log('Submitting return with details:', {
                                    packageId: pkg.id,
                                    returnStatus: 'returned',
                                    returnedBy: returnDetails.returnedBy,
                                    returnNotes: returnDetails.returnNotes,
                                    returnedAt: date.toISOString()
                                  });
                                  
                                  try {
                                    // Update the return status and get the updated package data
                                    const updatedPackage = await updatePackageReturnStatus(
                                      pkg.id, 
                                      'returned',
                                      returnDetails.returnedBy,
                                      returnDetails.returnNotes,
                                      date.toISOString()
                                    );
                                    
                                    console.log('Return update response:', updatedPackage);
                                    
                                    // Update the local package state with the returned data
                                    setPkg((prevPkg: any) => ({
                                      ...prevPkg,
                                      return_status: 'returned',
                                      returned_by: returnDetails.returnedBy,
                                      return_notes: returnDetails.returnNotes,
                                      returned_at: date.toISOString(),
                                      // Update the status to reflect the return
                                      status: 'returned' as const
                                    }));
                                    
                                    // Show success message with tracking number and received by
                                    const trackingNumber = pkg.tracking_number || pkg.trackingNumber || 'N/A';
                                    const receivedBy = returnDetails.returnedBy.trim() || 'N/A';
                                    toast.success(
                                      <div>
                                        <div>Package {trackingNumber} return recorded successfully</div>
                                        <div className="text-sm mt-1">Received by: {receivedBy}</div>
                                      </div>,
                                      {
                                        position: 'top-right',
                                        autoClose: 5000,
                                        hideProgressBar: false,
                                        closeOnClick: true,
                                        pauseOnHover: true,
                                        draggable: true,
                                        progress: undefined,
                                      }
                                    );
                                    
                                    // Close the modal
                                    setShowReturnModal(false);
                                    
                                    // Reset form
                                    setReturnDetails({
                                      returnedBy: '',
                                      returnNotes: '',
                                      returnedDate: new Date().toISOString().split('T')[0],
                                      returnedTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
                                    });
                                    
                                    // Update the UI state to reflect the return
                                    setPkg(prevPkg => ({
                                      ...prevPkg,
                                      returnStatus: 'returned',
                                      return_status: 'returned',
                                      returned_at: date.toISOString(),
                                      status: 'returned' as const
                                    }));
                                    
                                    // No background refresh - UI updates are handled by local state
                                    
                                  } catch (error: unknown) {
                                    console.error('Error updating return status:', error);
                                    const errorMessage = error instanceof Error 
                                      ? error.message 
                                      : 'Failed to update return status';
                                    toast.error(errorMessage);
                                    throw error;
                                  }
                                } catch (error) {
                                  console.error('Error marking package as returned:', error);
                                  toast.error('Failed to mark package as returned');
                                } finally {
                                  setIsMarkingReturned(false);
                                }
                              }}
                              disabled={isMarkingReturned || !returnDetails.returnedBy.trim()}
                              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                              {isMarkingReturned ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Processing...
                                </>
                              ) : (
                                'Confirm Return'
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <Link to="/dashboard">
                <button className="flex items-center px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </button>
              </Link>
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-white/10 rounded-full transition"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Gate Pass Modal */}
        {showGatePass && pkg && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-auto relative">
              <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex justify-between items-center z-10">
                <h2 className="text-lg font-semibold text-slate-800">Gate Pass</h2>
                <button
                  onClick={() => setShowGatePass(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition"
                >
                  <X className="h-5 w-5 text-slate-600" />
                </button>
              </div>
              <div className="p-4">
                <GatePass packageData={pkg} />
              </div>
            </div>
          </div>
        )}

        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Package Details Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="border-b border-slate-200 bg-slate-50/50 px-6 py-4 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                  <PackageIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Package Details
                </h2>
                <div className="flex items-center space-x-2">
                  {/* <span className={`text-xs font-medium px-2 py-1 rounded-full ${pkg.priority === 'high' ? 'bg-red-100 text-red-700' : pkg.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                    {pkg.priority?.charAt(0).toUpperCase() + pkg.priority?.slice(1) || 'Medium'} Priority
                  </span> */}
                  <StatusBadge status={pkg.status} isResubmitted={pkg.resubmitted} />
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Tracking and Gate Pass Info */}
                <div className="flex flex-col md:flex-row md:justify-between md:items-center p-4 bg-blue-50 border border-blue-100 rounded-lg mb-4">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Tracking Number</p>
                    <p className="text-lg font-bold text-slate-800">{pkg.tracking_number || pkg.trackingNumber}</p>
                  </div>
                  <div className="mt-3 md:mt-0 md:text-right">
                    <p className="text-sm text-slate-500 mb-1">Gate Pass Serial Number</p>
                    <p className="text-lg font-bold text-blue-700">{pkg.gate_pass_serial_number || pkg.gatePassSerialNumber || 'N/A'}</p>
                  </div>
                </div>
                
                {/* Basic Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* To Address Info */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 text-blue-600 mr-3 mt-1" />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 mb-2">To Address</p>
                        <p className="text-slate-700">{pkg.toAddress || pkg.to_address || 'Not specified'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Recipient Info */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="flex items-start">
                      <User className="h-5 w-5 text-blue-600 mr-3 mt-1" />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 mb-2">Recipient</p>
                        <p className="text-slate-700">{pkg.recipient}</p>
                      </div>
                    </div>
                  </div>

                  {/* Assigned Manager Info
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="flex items-start">
                      <User className="h-5 w-5 text-blue-600 mr-3 mt-1" />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 mb-2">Assigned Manager</p>
                        <p className="text-slate-700">
                          {pkg.assigned_manager_name || 
                           pkg.assignedManager?.full_name || 
                           (pkg.assigned_to_manager ? `Manager ID: ${pkg.assigned_to_manager}` : 'Not assigned')}
                        </p>
                      </div>
                    </div>
                  </div> */}
                </div>

                 {/* Item Details Section */}
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-md font-semibold text-slate-800 mb-4">Item Details</h3>
                  {pkg.items && pkg.items.length > 0 ? (
                    <div className="space-y-4">
                      {pkg.items.map((item: any, index: number) => (
                        <div key={item.id || index} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                          <p className="font-medium text-slate-700 mb-2">Item {index + 1}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            <div>
                              <span className="text-slate-500">Serial Number: </span>
                              <span className="text-slate-800 font-medium">{item.serial_number || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">HSN Code: </span>
                              <span className="text-slate-800 font-medium">{item.hsn_code || 'N/A'}</span>
                            </div>
                            <div className="md:col-span-2">
                              <span className="text-slate-500">Description: </span>
                              <span className="text-slate-800 font-medium">{item.description || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Quantity: </span>
                              <span className="text-slate-800 font-medium">{item.quantity || 1}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Unit Price: </span>
                              <span className="text-slate-800 font-medium">
                                {(() => {
                                  const unitPrice = item.unit_price ?? item.unitPrice;
                                  if (unitPrice !== undefined && unitPrice !== null) {
                                    // Convert to number, round to nearest integer, and convert back to string
                                    return Math.round(Number(unitPrice)).toString();
                                  }
                                  return 'N/A';
                                })()}
                              </span>
                            </div>
                            <div className="md:col-span-2">
                              <span className="text-slate-500">Taxable Value: </span>
                              <span className="text-slate-800 font-medium">
                                {(() => {
                                  if (item.value !== undefined && item.value !== null) {
                                    // Convert to number, round to nearest integer, and convert back to string
                                    return Math.round(Number(item.value)).toString();
                                  }
                                  return 'N/A';
                                })()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center text-slate-500">
                      No item details available for this package.
                    </div>
                  )}
                </div>

                {/* Weight and Dimensions Section */}
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-md font-semibold text-slate-800 mb-4">Package Physical Details</h3>
                  
                  {/* Package Dimensions Section */}
                  <div className="space-y-4">
                    {pkg.dimensions?.length > 0 ? (
                      // Display each dimension entry
                      pkg.dimensions.map((dim: any, index: number) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-3 rounded-lg">
                          <div>
                            <p className="text-sm text-slate-600">
                              {pkg.dimensions.length > 1 ? `Weight ${index + 1}` : 'Weight'}
                            </p>
                            <p className="font-medium">
                              {dim.weight ? `${dim.weight} ${dim.weight_unit || 'kg'}` : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-600">
                              {pkg.dimensions.length > 1 ? `Dimension ${index + 1}` : 'Dimension'}
                            </p>
                            <p className="font-medium">{dim.dimension || 'N/A'}</p>
                          </div>
                          {dim.purpose && (
                            <div>
                              <p className="text-sm text-slate-600">Purpose</p>
                              <p className="font-medium">{dim.purpose}</p>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      // Fallback to legacy fields if no dimensions
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <p className="text-sm text-slate-600">Weigh</p>
                          <p className="font-medium">
                            {pkg.weight ? `${pkg.weight} ${pkg.weight_unit || 'kg'}` : 'N/A'}
                          </p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <p className="text-sm text-slate-600">Dimension</p>
                          <p className="font-medium">{pkg.dimension || 'N/A'}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <p className="text-sm text-slate-600">Number of Parcels</p>
                          <p className="font-medium">{pkg.number_of_packages || 1}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Package Images Card */}
                {renderImagesSection()}
                
                {/* Transportation Details */}
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-md font-semibold text-slate-800 mb-4">Transportation Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-sm text-slate-600">Transportation Type</p>
                      <p className="font-medium">{pkg.transportation_type || pkg.transportationType || 'Courier'}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-sm text-slate-600">Package Type</p>
                      <p className="font-medium">{(pkg.is_returnable || pkg.isReturnable) ? 'Returnable' : 'Non-returnable'}</p>
                    </div>
                    {/* Courier and Carrier Information */}
                    {pkg.courier_name && (
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-sm text-slate-600">Courier Name</p>
                        <p className="font-medium">{pkg.courier_name}</p>
                      </div>
                    )}
                    {pkg.courier_tracking_number && (
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-sm text-slate-600">Courier Tracking #</p>
                        <p className="font-medium">{pkg.courier_tracking_number}</p>
                      </div>
                    )}
                    {pkg.carrier_name && (
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-sm text-slate-600">Carrier Name</p>
                        <p className="font-medium">{pkg.carrier_name}</p>
                      </div>
                    )}
                    {(pkg.vehicleDetails || pkg.vehicle_details) && (
                      <div className="md:col-span-2 bg-slate-50 p-3 rounded-lg">
                        <p className="text-sm text-slate-600">Vehicle Details</p>
                        <p className="font-medium">{pkg.vehicleDetails || pkg.vehicle_details}</p>
                      </div>
                    )}
                    {(pkg.isReturnable || pkg.is_returnable) && (pkg.returnDate || pkg.return_date) && (
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-sm text-slate-600">Return Date</p>
                        <p className="font-medium">{pkg.returnDate || pkg.return_date}</p>
                      </div>
                    )}
                    {(pkg.isReturnable || pkg.is_returnable) && (pkg.returnReason || pkg.return_reason) && (
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-sm text-slate-600">Return Reason</p>
                        <p className="font-medium">{pkg.returnReason || pkg.return_reason}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Additional Notes */}
                {pkg.notes && (
                  <div className="border-t border-slate-200 pt-6">
                    <h3 className="text-md font-semibold text-slate-800 mb-4">Notes</h3>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <p className="text-slate-700">{pkg.notes}</p>
                    </div>
                  </div>
                )}
                
                {/* Purpose */}
                {(pkg.purpose) && (
                  <div className="border-t border-slate-200 pt-6">
                    <h3 className="text-md font-semibold text-slate-800 mb-4">Purpose</h3>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <p className="text-slate-700">{pkg.purpose}</p>
                    </div>
                  </div>
                )}
                
                {/* Package Images */}
                {(pkg.image_before_packing_path || pkg.image_after_packing_path) && (
                  <div className="border-t border-slate-200 pt-6">
                    <h3 className="text-md font-semibold text-slate-800 mb-4">Package Images</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {pkg.image_before_packing_path && (
                        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                          <div className="aspect-w-16 aspect-h-10 bg-slate-100 overflow-hidden">
                            <img 
                              src={getImageUrl(pkg.image_before_packing_path)} 
                              alt="Before Packing"
                              className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => {
                                setCurrentImageIndex(0);
                                setIsImageModalOpen(true);
                              }}
                              onError={(e) => {
                                console.error('Error loading image:', pkg.image_before_packing_path);
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                                target.src = placeholderImage;
                                // Log the error to the console for debugging
                                console.error('Image load error:', {
                                  src: target.src,
                                  currentSrc: target.currentSrc,
                                  error: e
                                });
                              }}
                            />
                          </div>
                          <div className="p-3 bg-slate-50 border-t border-slate-100">
                            <p className="text-sm font-medium text-slate-700">Before Packing</p>
                          </div>
                        </div>
                      )}
                      {pkg.image_after_packing_path && (
                        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                          <div className="aspect-w-16 aspect-h-10 bg-slate-100 overflow-hidden">
                            <img 
                              src={getImageUrl(pkg.image_after_packing_path)} 
                              alt="After Packing"
                              className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => {
                                setCurrentImageIndex(pkg.image_before_packing_path ? 1 : 0);
                                setIsImageModalOpen(true);
                              }}
                              onError={(e) => {
                                console.error('Error loading image:', pkg.image_before_packing_path);
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                                target.src = placeholderImage;
                                // Log the error to the console for debugging
                                console.error('Image load error:', {
                                  src: target.src,
                                  currentSrc: target.currentSrc,
                                  error: e
                                });
                              }}
                            />
                          </div>
                          <div className="p-3 bg-slate-50 border-t border-slate-100">
                            <p className="text-sm font-medium text-slate-700">After Packing</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Status Timeline */}
                <div className="mt-8 border-t border-slate-200 pt-6">
                  <div className="flex flex-col space-y-4">
                    {pkg.status === 'dispatched' && (
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="font-medium text-green-600">Dispatched</p>
                          <p className="text-sm text-slate-500">{formatDate(pkg.dispatchedAt)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Status and Actions */}
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="border-b border-slate-200 bg-slate-50/50 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-800">Current Status</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className={`p-4 rounded-lg ${getStatusCardStyles(pkg.status)}`}>
                  <div className="flex items-center">
                    {pkg.status === 'Status' && <Clock className="h-5 w-5 mr-2" />}
                    {pkg.status === 'approved' && <Check className="h-5 w-5 mr-2" />}
                    {pkg.status === 'rejected' && <X className="h-5 w-5 mr-2" />}
                    {pkg.status === 'dispatched' && <Send className="h-5 w-5 mr-2" />}
                    <p className="font-medium">
                      {pkg.status.charAt(0).toUpperCase() + pkg.status.slice(1)}
                      {pkg.resubmitted && ' (Resubmitted)'}
                    </p>
                  </div>
                  
                  {pkg.status === 'rejected' && (pkg.rejectionReason || pkg.rejection_reason) && (
                    <div className="mt-2 pt-2 border-t border-red-200">
                      <p className="text-sm"><span className="font-medium">Reason:</span> {pkg.rejectionReason || pkg.rejection_reason}</p>
                    </div>
                  )}
                </div>
                
                {pkg.status === 'submitted' && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-blue-700">
                    <p className="flex items-center">
                      <Clock className="h-5 w-5 mr-2" />
                      Awaiting approval
                    </p>
                  </div>
                )}
                
                {/* Assigned Manager */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <p className="text-sm text-slate-600 mb-1">Assigned Manager</p>
                  <p className="font-medium">
                    {console.log('Package manager data:', {
                      assignedManager: pkg.assignedManager,
                      assigned_manager: pkg.assigned_manager,
                      assignedManagerName: pkg.assignedManagerName,
                      assigned_manager_name: pkg.assigned_manager_name,
                      assigned_to_manager: pkg.assigned_to_manager,
                      assignedToManager: pkg.assignedToManager
                    })}
                    {pkg.assignedManager?.fullName || 
                     pkg.assigned_manager?.full_name ||
                     pkg.assignedManagerName || 
                     pkg.assigned_manager_name || 
                     (pkg.assigned_to_manager ? pkg.assignedManager?.full_name : 'Not assigned')}
                  </p>
                </div>
                
                {/* Submission Date */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <p className="text-sm text-slate-600 mb-1">Submission Date</p>
                  <p className="font-medium">{formatDate(pkg.submittedAt || pkg.submitted_at || pkg.created_at)}</p>
                </div>


                  {/* Submitted By */}
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <p className="text-sm text-slate-600 mb-1">Submitted By</p>
                  <p className="font-medium">
                    {console.log('Package manager data:', {
                      submitted_by_user: pkg.submitted_by_user,
                      submitted_by: pkg.submitted_by,
                      submittedByName: pkg.submittedByName,
                      submitted_by_name: pkg.submitted_by_name,
                      
                    })}
                    {pkg.submitted_by_user?.fullName || 
                     pkg.submitted_by?.full_name ||
                     pkg.submittedByName || 
                     pkg.submitted_by_name || 
                     (pkg.submitted_by ? pkg.submitted_by_user?.full_name : 'Not assigned')}
                  </p>
                </div>
                
                 
                
                {/* Package Barcode */}
                <div className="mt-6">
                  <h3 className="text-md font-semibold text-slate-800 mb-3">Package Barcode</h3>
                  <div className="bg-white border-2 border-blue-100 rounded-xl p-4 text-center">
                    <div className="flex flex-col space-y-2 mb-3">
                      <div>
                        <p className="text-sm text-slate-500 mb-1">Tracking Number</p>
                        <p className="text-lg font-bold text-slate-800">{pkg.tracking_number || pkg.trackingNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 mb-1">Gate Pass</p>
                        <p className="text-lg font-bold text-blue-700">{pkg.gate_pass_serial_number || pkg.gatePassSerialNumber || 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div className="border-2 border-dashed border-slate-200 rounded-lg mb-4 overflow-hidden bg-white">
                      <div id="barcode-svg" className="flex justify-center p-2 w-full">
                        <Barcode 
                          value={pkg.tracking_number || pkg.trackingNumber} 
                          format="CODE128" 
                          height={60} 
                          width={2}
                          margin={10}
                          background="#ffffff"
                          lineColor="#000000"
                          displayValue={false} 
                        />
                      </div>
                    </div>
                    

                  </div>
                </div>
              </div>
            </div>

            {/* Package History Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Package History</h3>
                <div className="space-y-3">
                  {pkg.createdAt && (
                    <div className="flex items-center text-sm">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mr-2"></div>
                      <p className="text-slate-600">Created on {formatDate(pkg.createdAt)}</p>
                    </div>
                  )}
                  {pkg.approvedAt && (
                    <div className="flex items-center text-sm">
                      <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
                      <p className="text-slate-600">Approved on {formatDate(pkg.approvedAt)}</p>
                    </div>
                  )}
                  {pkg.dispatchedAt && (
                    <div className="flex items-center text-sm">
                      <div className="w-2 h-2 bg-purple-600 rounded-full mr-2"></div>
                      <p className="text-slate-600">Dispatched on {formatDate(pkg.dispatchedAt)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Return Information Card - Show if there's return information */}
            {(pkg.returned_by || pkg.returnedBy || pkg.returned_at || pkg.returnedAt) && (
              <div className="mt-8 border-t border-slate-200 pt-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Return Information</h3>
                <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center">
                    <div className="h-2 w-2 bg-orange-500 rounded-full mr-3"></div>
                    <p className="text-sm text-slate-700">
                      <span className="font-medium">Returned by:</span> {pkg.returned_by || pkg.returnedBy || 'N/A'}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <div className="h-2 w-2 bg-orange-500 rounded-full mr-3"></div>
                    <p className="text-sm text-slate-700">
                      <span className="font-medium">Returned at:</span> {pkg.returned_at || pkg.returnedAt ? 
                        formatDate(new Date(pkg.returned_at || pkg.returnedAt)) : 'N/A'}
                    </p>
                  </div>
                  {(pkg.return_notes || pkg.returnNotes) && (
                    <div className="flex items-start">
                      <div className="h-2 w-2 bg-orange-500 rounded-full mr-3 mt-1.5 flex-shrink-0"></div>
                      <p className="text-sm text-slate-700">
                        <span className="font-medium">Notes:</span> {pkg.return_notes || pkg.returnNotes}
                      </p>
                    </div>
                  )}

                </div>
              </div>
            )}

            {user?.role === 'security' && pkg.status === 'approved' && (
              <button
                className="w-full mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={handleApproveAndDispatch}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : 'Approve and Dispatch'}
              </button>
            )}
            
            {/* {user?.role === 'security' && pkg.status === 'dispatched' && pkg.return_status !== 'returned' && (
              <button
                className="w-full mt-4 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                onClick={() => setShowReturnModal(true)}
                disabled={isMarkingReturned}
              >
                <Undo className="h-4 w-4" />
                {isMarkingReturned ? 'Processing...' : 'Mark as Returned'}
              </button>
            )} */}
          </div>
        </div>

        

        <div className="bg-slate-50 border-t border-slate-200 p-4 text-center text-sm text-slate-600 rounded-b-2xl">
          DeliverySafe &copy; 2025
        </div>
      </div>
      
      {/* Image Modal */}
      {isImageModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setIsImageModalOpen(false)}
        >
          <button 
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={(e) => {
              e.stopPropagation();
              setIsImageModalOpen(false);
            }}
          >
            <X className="h-8 w-8" />
          </button>
          
          <button 
            className="absolute left-4 text-white hover:text-gray-300 p-2"
            onClick={(e) => {
              e.stopPropagation();
              goToPreviousImage();
            }}
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          
          <div className="max-w-4xl w-full mx-auto">
            <div className="relative">
              {(() => {
                // Get all images in a single array for easier navigation
                const allImages = [...(packageImages.before || []), ...(packageImages.after || [])];
                const currentImage = allImages[currentImageIndex];
                const totalImages = allImages.length;
                
                if (!currentImage) {
                  return (
                    <div className="bg-slate-800 rounded-lg p-8 text-center text-white">
                      <p>No image available</p>
                    </div>
                  );
                }
                
                return (
                  <>
                    <img 
                      src={getImageUrl(currentImage.image_path)}
                      alt={currentImage.image_type === 'before' ? 'Before Packing' : 'After Packing'}
                      className="max-h-[80vh] w-auto mx-auto rounded-lg shadow-2xl"
                      onError={(e) => {
                        console.error('Error loading modal image:', currentImage.image_path);
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = placeholderImage;
                        console.error('Modal image load error:', {
                          src: target.src,
                          currentSrc: target.currentSrc,
                          error: e,
                          currentImageIndex,
                          currentImage
                        });
                      }}
                    />
                    <div className="absolute bottom-4 left-0 right-0 text-center text-white text-sm bg-black bg-opacity-50 py-1 rounded-full mx-auto w-32">
                      {currentImageIndex + 1} / {totalImages}
                    </div>
                    <div className="absolute top-4 left-0 right-0 text-center">
                      <span className="inline-block bg-black bg-opacity-50 text-white text-sm px-3 py-1 rounded-full">
                        {currentImage.image_type === 'before' ? 'Before Packing' : 'After Packing'}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
          
          <button 
            className="absolute right-4 text-white hover:text-gray-300 p-2"
            onClick={(e) => {
              e.stopPropagation();
              goToNextImage();
            }}
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        </div>
      )}
    </div>
  );
};

export default PackageDetailPage;