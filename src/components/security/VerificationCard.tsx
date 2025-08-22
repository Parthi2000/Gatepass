import React, { useState } from 'react';
import { Package as PackageType } from '../../types';
import { formatDate } from '../../utils/helpers';
import StatusBadge from '../common/StatusBadge';
import { Check, Truck, Package as PackageIcon } from 'lucide-react';
import BarcodeGenerator from '../barcode/BarcodeGenerator';

interface VerificationCardProps {
  pkg: PackageType;
  onDispatch: (id: string, notes: string) => void;
}

const VerificationCard: React.FC<VerificationCardProps> = ({ pkg, onDispatch }) => {
  const [notes, setNotes] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  
  const handleDispatch = () => {
    onDispatch(pkg.id, notes);
    setNotes('');
  };
  
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden border border-slate-200 transition-all duration-200 hover:shadow-lg">
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center">
            <PackageIcon className="h-5 w-5 mr-2 text-blue-600" />
            {pkg.description}
          </h3>
          <StatusBadge status={pkg.status} />
        </div>
        
        <div className="text-sm text-slate-600 space-y-1 mb-3">
          <p><span className="font-medium">Tracking:</span> {pkg.trackingNumber}</p>
          <p><span className="font-medium">Recipient:</span> {pkg.recipient}</p>
          <p><span className="font-medium">To Address:</span> {pkg.to_address || 'Not specified'}</p>
          <p><span className="font-medium">Submitted:</span> {formatDate(pkg.submittedAt)}</p>
          <p><span className="font-medium">Approved:</span> {formatDate(pkg.approvedAt)}</p>
          {pkg.notes && <p><span className="font-medium">Notes:</span> {pkg.notes}</p>}
        </div>
        
        <button 
          onClick={() => setIsExpanded(!isExpanded)} 
          className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-3"
        >
          {isExpanded ? 'Hide Barcode' : 'Show Barcode'}
        </button>
        
        {isExpanded && (
          <div className="mb-4">
            <BarcodeGenerator 
              value={pkg.trackingNumber} 
              description={pkg.description}
            />
          </div>
        )}
        
        {pkg.status === 'approved' && (
          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor={`notes-${pkg.id}`} className="block mb-1 text-sm font-medium text-slate-700">
                Dispatch Notes (Optional)
              </label>
              <textarea
                id={`notes-${pkg.id}`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Add any notes for this dispatch"
              />
            </div>
            
            <button
              onClick={handleDispatch}
              className="w-full flex justify-center items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200"
            >
              <Truck className="h-4 w-4 mr-2" />
              Approve and Dispatch
            </button>
          </div>
        )}
        
        {pkg.status === 'dispatched' && (
          <div className="mt-3 py-2 px-3 bg-green-50 border border-green-200 rounded-md text-green-700 flex items-center">
            <Check className="h-5 w-5 mr-2" />
            Package was dispatched on {formatDate(pkg.dispatchedAt)}
          </div>
        )}
      </div>
    </div>
  );
};

export default VerificationCard;