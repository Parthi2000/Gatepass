import React from 'react';
import { Link } from 'react-router-dom';
import { Package as PackageIcon, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { Package } from '../../types';

interface ApprovalCardProps {
  pkg: Package;
  onApprove: (id: string, notes: string) => void;
  onReject: (id: string) => void;
  isAssigned?: boolean;
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({ pkg, onApprove, onReject }) => {
  const [notes, setNotes] = React.useState('');

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-all duration-200">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <PackageIcon className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-1">
                {pkg.description || 'Package'}
              </h3>
              <p className="text-sm text-slate-600">{pkg.trackingNumber}</p>
            </div>
          </div>
          <StatusBadge status={pkg.status} />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-50 p-3 rounded">
            <p className="text-xs font-medium text-slate-500 mb-1">Recipient</p>
            <p className="text-sm font-medium text-slate-800">{pkg.recipient}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded">
            <p className="text-xs font-medium text-slate-500 mb-1">To Address</p>
            <p className="text-sm font-medium text-slate-800">{pkg.to_address || 'Not specified'}</p>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={2}
            placeholder="Add any notes about this package..."
          />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="text-xs text-slate-500">
            Submitted {pkg.submittedAt ? new Date(pkg.submittedAt).toLocaleDateString() : 'N/A'}
            {pkg.status === 'approved' && pkg.gatePassSerialNumber && (
              <div className="mt-1">
                <span className="font-medium">Gate Pass:</span> {pkg.gatePassSerialNumber}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Link 
              to={`/package/${pkg.id}`}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center"
            >
              Details
              <ExternalLink className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end space-x-3">
          <button
            onClick={() => onReject(pkg.id)}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-md flex items-center"
          >
            <XCircle className="h-4 w-4 mr-1" />
            Reject
          </button>
          <button
            onClick={() => onApprove(pkg.id, notes)}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md flex items-center"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Approve
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalCard;