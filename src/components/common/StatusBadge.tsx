import React from 'react';
import { PackageStatus } from '../../types';
import { getStatusColor } from '../../utils/helpers';

interface StatusBadgeProps {
  status: PackageStatus;
  isResubmitted?: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, isResubmitted = false }) => {
  const colorClasses = getStatusColor(status);
  
  return (
    <div className="flex items-center space-x-1">
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${colorClasses} capitalize`}>
        {status}
      </span>
      {isResubmitted && (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
          Resubmitted
        </span>
      )}
    </div>
  );
};

export default StatusBadge;