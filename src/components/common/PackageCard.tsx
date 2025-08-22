import React, { useState } from 'react';
import { Package as PackageType } from '../../types';
import { formatDate } from '../../utils/helpers';
import StatusBadge from './StatusBadge';
import { Link } from 'react-router-dom';
import { PackageOpen, ExternalLink, ChevronUp, ChevronDown, MapPin, User, Calendar, RotateCcw, Truck, Hash, FileText, Image } from 'lucide-react';

interface PackageCardProps {
  pkg: PackageType;
  showActions?: boolean;
  onView?: (id: string) => void;
}

const PackageCard: React.FC<PackageCardProps> = ({ 
  pkg, 
  showActions = true,
  onView 
}) => {
  const [expanded, setExpanded] = useState(false);
  
  // Extract all relevant fields from the package
  const trackingNumber = pkg.trackingNumber || (pkg as any).tracking_number;
  const gatePassNumber = pkg.gatePassSerialNumber || (pkg as any).gate_pass_serial_number || 'N/A';
  const priority = pkg.priority || (pkg as any).priority || 'medium';
  const isReturnable = pkg.isReturnable || (pkg as any).is_returnable || false;
  const transportationType = pkg.transportationType || (pkg as any).transportation_type || 'courier';
  const serialNumber = pkg.serialNumber || (pkg as any).serial_number || 'N/A';
  const hsnCode = pkg.hsnCode || (pkg as any).hsn_code || 'N/A';
  const quantity = pkg.quantity || (pkg as any).quantity || 1;
  const unitPrice = pkg.unitPrice || (pkg as any).unit_price || 'N/A';
  const weight = pkg.weight || (pkg as any).weight || 'N/A';
  const weightUnit = pkg.weightUnit || (pkg as any).weight_unit || 'kg';
  const purpose = pkg.purpose || 'N/A';
  
  // Base64 placeholder image
  const placeholderImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9IiNlZWVlZWUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiNlZWVlZWIiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSIgZmlsbD0iIzk5OSI+SW1hZ2UgTm90IEF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
  
  // Get image URL with fallback for different path formats
  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return placeholderImage;
    
    // If it's already a full URL or data URL, return as is
    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
      return imagePath;
    }
    
    // Get base URL from environment variable or use default
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://192.168.5.244:3001';
    
    // Handle paths that might already include /uploads
    let cleanPath = imagePath;
    if (!cleanPath.startsWith('/')) {
      cleanPath = `/${cleanPath}`;
    }
    
    // If the path already includes the base URL, return as is
    if (cleanPath.startsWith(baseUrl)) {
      return cleanPath;
    }
    
    // Construct the full URL
    const fullUrl = `${baseUrl}${cleanPath}`;
    
    console.log('PackageCard - Image URL:', { 
      original: imagePath, 
      clean: cleanPath, 
      full: fullUrl,
      env: import.meta.env.VITE_API_BASE_URL 
    });
    
    return fullUrl;
  };
  
  const imageBeforePackingPath = pkg.imageBeforePackingPath || pkg.image_before_packing_path;
  const imageAfterPackingPath = pkg.imageAfterPackingPath || pkg.image_after_packing_path;
  
  return (
    <div className="group relative bg-white backdrop-blur-sm shadow-lg rounded-2xl border border-slate-200/60 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 hover:border-blue-300/40" style={{ overflow: 'hidden' }}>
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/20 pointer-events-none" />
      
      {/* Animated priority indicator line */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r transition-all duration-500 ${
        priority === 'high' 
          ? 'from-red-400 via-red-500 to-red-600' 
          : priority === 'medium' 
          ? 'from-amber-400 via-amber-500 to-amber-600' 
          : 'from-green-400 via-green-500 to-green-600'
      }`} />
      
      {/* Header Section with Glass Effect */}
      <div className="relative bg-gradient-to-r from-slate-50/80 via-white/60 to-slate-50/80 backdrop-blur-sm px-6 py-4 border-b border-slate-200/60">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <PackageOpen className="h-5 w-5 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 truncate bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                {pkg.description || `Package #${pkg.id}`}
              </h3>
              <p className="text-sm text-slate-500 font-medium">ID: {pkg.id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`relative px-3 py-1.5 rounded-full font-semibold text-xs uppercase tracking-wide backdrop-blur-sm border transition-all duration-300 ${
              priority === 'high' 
                ? 'bg-gradient-to-r from-red-50 to-red-100 text-red-700 border-red-200 shadow-red-100 shadow-lg' 
                : priority === 'medium' 
                ? 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 border-amber-200 shadow-amber-100 shadow-lg' 
                : 'bg-gradient-to-r from-green-50 to-green-100 text-green-700 border-green-200 shadow-green-100 shadow-lg'
            }`}>
              <span className="relative z-10">{priority}</span>
              <div className={`absolute inset-0 rounded-full opacity-20 ${
                priority === 'high' ? 'bg-red-400' : priority === 'medium' ? 'bg-amber-400' : 'bg-green-400'
              } animate-pulse`} />
            </div>
            <StatusBadge status={pkg.status} isResubmitted={pkg.resubmitted} />
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="relative p-6">
        {/* Tracking and Gate Pass - Enhanced Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="relative p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl border border-blue-200/60 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300 group/card">
            <div className="absolute top-2 right-2 w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            <p className="text-xs font-semibold text-blue-600 mb-2 uppercase tracking-wider">Tracking Number</p>
            <p className="font-bold text-slate-800 text-lg">{trackingNumber}</p>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-transparent rounded-xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
          </div>
          <div className="relative p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl border border-purple-200/60 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300 group/card">
            <div className="absolute top-2 right-2 w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
            <p className="text-xs font-semibold text-purple-600 mb-2 uppercase tracking-wider">Gate Pass</p>
            <p className="font-bold text-slate-800 text-lg">{gatePassNumber}</p>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400/10 to-transparent rounded-xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
          </div>
        </div>
        
        {/* Basic Info Grid - Modernized */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="flex items-start space-x-3 p-3 rounded-xl bg-gradient-to-r from-slate-50 to-gray-50 border border-slate-200/60 hover:shadow-sm transition-all duration-300">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-lg flex items-center justify-center shadow-sm">
              <MapPin className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-emerald-600 mb-1 uppercase tracking-wider">To Address</p>
              <p className="font-bold text-slate-800 truncate">{pkg.to_address || 'Not specified'}</p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-3 rounded-xl bg-gradient-to-r from-slate-50 to-gray-50 border border-slate-200/60 hover:shadow-sm transition-all duration-300">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-400 to-violet-500 rounded-lg flex items-center justify-center shadow-sm">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-violet-600 mb-1 uppercase tracking-wider">Recipient</p>
              <p className="font-bold text-slate-800 truncate">{pkg.recipient}</p>
            </div>
          </div>
        </div>
        
        {/* Submission Date */}
        <div className="flex items-center space-x-3 p-3 mb-6 rounded-xl bg-gradient-to-r from-indigo-50 to-indigo-100/50 border border-indigo-200/60">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-indigo-500 rounded-lg flex items-center justify-center shadow-sm">
            <Calendar className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Submitted</p>
            <p className="font-bold text-slate-800">{formatDate(pkg.submittedAt || pkg.created_at)}</p>
          </div>
        </div>
        
        {/* Expandable Details Section */}
        {expanded && (
          <div className="mt-6 pt-6 border-t border-slate-200/60 animate-in slide-in-from-top-2 duration-300 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 overflow-hidden">
              {/* Item Details - Enhanced */}
              <div className="relative p-5 bg-gradient-to-br from-slate-50 via-white to-slate-50/50 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-t-2xl" />
                <h4 className="text-sm font-bold mb-4 flex items-center text-slate-800">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-2 shadow-sm">
                    <Hash className="h-3 w-3 text-white" />
                  </div>
                  Item Details
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm overflow-hidden">
                  {[
                    { label: 'Serial Number', value: serialNumber },
                    { label: 'HSN Code', value: hsnCode },
                    { label: 'Quantity', value: quantity },
                    { label: 'Unit Price', value: unitPrice }
                  ].map((item, index) => (
                    <div key={index} className="space-y-1 overflow-hidden">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider truncate">{item.label}</p>
                      <p className="font-bold text-slate-800 truncate">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Shipping Details - Enhanced */}
              <div className="relative p-5 bg-gradient-to-br from-slate-50 via-white to-slate-50/50 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-t-2xl" />
                <h4 className="text-sm font-bold mb-4 flex items-center text-slate-800">
                  <div className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center mr-2 shadow-sm">
                    <Truck className="h-3 w-3 text-white" />
                  </div>
                  Shipping Details
                </h4>
                <div className="space-y-4 text-sm overflow-hidden">
                  <div className="grid grid-cols-2 gap-4 overflow-hidden">
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider truncate">Weight</p>
                      <p className="font-bold text-slate-800 truncate">{weight} {weightUnit}</p>
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider truncate">Type</p>
                      <p className="font-bold text-slate-800 flex items-center truncate">
                        {isReturnable && <RotateCcw className="h-3 w-3 mr-1 text-emerald-500 flex-shrink-0" />}
                        <span className="truncate">{isReturnable ? 'Returnable' : 'Non-returnable'}</span>
                      </p>
                    </div>
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider truncate">Transportation</p>
                    <p className="font-bold text-slate-800 truncate">{transportationType === 'byHand' ? 'By Hand' : 'Courier'}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Package Images - Enhanced */}
            {(imageBeforePackingPath || imageAfterPackingPath) && (
              <div className="relative p-5 bg-gradient-to-br from-blue-50 via-white to-blue-50/50 rounded-2xl border border-blue-200/60 shadow-sm overflow-hidden mb-6">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-t-2xl" />
                <h4 className="text-sm font-bold mb-4 flex items-center text-slate-800">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-2 shadow-sm">
                    <Image className="h-3 w-3 text-white" />
                  </div>
                  Package Images
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {imageBeforePackingPath && (
                    <div className="relative group">
                      <div className="aspect-w-16 aspect-h-9 bg-slate-100 rounded-lg overflow-hidden">
                        <img 
                          src={getImageUrl(imageBeforePackingPath)}
                          alt="Before Packing"
                          className="w-full h-full object-cover rounded-lg"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = placeholderImage;
                          }} 
                        />
                      </div>
                      <div className="mt-2 text-xs font-medium text-center text-slate-600">Before Packing</div>
                    </div>
                  )}
                  {imageAfterPackingPath && (
                    <div className="relative group">
                      <div className="aspect-w-16 aspect-h-9 bg-slate-100 rounded-lg overflow-hidden">
                        <img 
                          src={getImageUrl(imageAfterPackingPath)}
                          alt="After Packing"
                          className="w-full h-full object-cover rounded-lg"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = placeholderImage;
                          }} 
                        />
                      </div>
                      <div className="mt-2 text-xs font-medium text-center text-slate-600">After Packing</div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Purpose and Notes - Enhanced */}
            {(purpose !== 'N/A' || pkg.notes) && (
              <div className="relative p-5 bg-gradient-to-br from-amber-50 via-white to-amber-50/50 rounded-2xl border border-amber-200/60 shadow-sm overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-amber-600 rounded-t-2xl" />
                <h4 className="text-sm font-bold mb-4 flex items-center text-slate-800">
                  <div className="w-6 h-6 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center mr-2 shadow-sm">
                    <FileText className="h-3 w-3 text-white" />
                  </div>
                  Additional Information
                </h4>
                <div className="space-y-3 overflow-hidden">
                  {purpose !== 'N/A' && (
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1 truncate">Purpose</p>
                      <p className="text-sm font-medium text-slate-800 break-words">{purpose}</p>
                    </div>
                  )}
                  {pkg.notes && (
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1 truncate">Notes</p>
                      <p className="text-sm font-medium text-slate-800 break-words">{pkg.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Package Images Section */}
            {(imageBeforePackingPath || imageAfterPackingPath) && (
              <div className="mt-6 pt-6 border-t border-slate-200/60">
                <div className="relative p-5 bg-gradient-to-br from-slate-50 via-white to-slate-50/50 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-teal-600 rounded-t-2xl" />
                  <h4 className="text-sm font-bold mb-4 flex items-center text-slate-800">
                    <div className="w-6 h-6 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center mr-2 shadow-sm">
                      <Image className="h-3 w-3 text-white" />
                    </div>
                    Package Images
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {imageBeforePackingPath && (
                      <div>
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 text-center">Before Packing</p>
                        <img 
                          src={getImageUrl(imageBeforePackingPath)}
                          alt="Before Packing" 
                          className="rounded-lg border border-slate-300 shadow-md w-full h-auto max-h-64 object-contain mx-auto transition-transform duration-300 hover:scale-105" 
                          onError={(e) => { 
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = placeholderImage;
                          }}
                        />
                      </div>
                    )}
                    {imageAfterPackingPath && (
                      <div>
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 text-center">After Packing</p>
                        <img 
                          src={getImageUrl(imageAfterPackingPath)}
                          alt="After Packing" 
                          className="rounded-lg border border-slate-300 shadow-md w-full h-auto max-h-64 object-contain mx-auto transition-transform duration-300 hover:scale-105"
                          onError={(e) => { 
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = placeholderImage;
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Footer Section - Modernized */}
      <div className="relative bg-gradient-to-r from-slate-100/80 via-white/60 to-slate-100/80 backdrop-blur-sm px-6 py-4 flex justify-between items-center border-t border-slate-200/60">
        <button 
          onClick={() => setExpanded(!expanded)}
          className="group/btn relative px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 bg-white/60 hover:bg-white border border-slate-200 hover:border-slate-300 rounded-xl transition-all duration-300 flex items-center shadow-sm hover:shadow-md"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-slate-50 to-white rounded-xl opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
          <span className="relative z-10 flex items-center">
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2 transition-transform duration-300 group-hover/btn:scale-110" />
                Hide Details
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2 transition-transform duration-300 group-hover/btn:scale-110" />
                Show Details
              </>
            )}
          </span>
        </button>
        
        {showActions && (
          onView ? (
            <button 
              onClick={() => {
                console.log('View package details button clicked for:', {
                  id: pkg.id,
                  tracking: trackingNumber
                });
                onView(pkg.id);
              }}
              className="group/btn relative px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl transition-all duration-300 flex items-center shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-500 rounded-xl opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
              <span className="relative z-10 flex items-center">
                View Full Details
                <ExternalLink className="ml-2 h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
              </span>
            </button>
          ) : (
            <Link 
              to={`/package/${pkg.id}`}
              onClick={() => {
                console.log('View package details link clicked for:', {
                  id: pkg.id,
                  tracking: trackingNumber
                });
              }}
              className="group/btn relative px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl transition-all duration-300 flex items-center shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-500 rounded-xl opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
              <span className="relative z-10 flex items-center">
                View Full Details
                <ExternalLink className="ml-2 h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
              </span>
            </Link>
          )
        )}
      </div>
    </div>
  );
};

export default PackageCard; 