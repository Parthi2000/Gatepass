import React from 'react';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  SendToBack, 
  RefreshCw,
  Package,
  PackagePlus,
  Settings,
  Plus,
  Trash2
} from 'lucide-react';
import { DashboardWidgetConfig } from '../../types/dashboard';
import { useDashboard } from '../../context/DashboardContext';

// Map of icon names to components
const iconMap: Record<string, React.ElementType> = {
  Clock,
  CheckCircle,
  XCircle,
  SendToBack,
  RefreshCw,
  Package,
  PackagePlus,
  Settings,
  Plus,
};

interface StatusCardProps {
  widget: DashboardWidgetConfig;
  count: number;
  onClick: () => void;
  description?: string;
  isEditing?: boolean;
  onEdit?: () => void;
  onRemove?: () => void;
}

export const StatusCard: React.FC<StatusCardProps> = ({ 
  widget, 
  count, 
  onClick,
  description, 
  isEditing, 
  onEdit, 
  onRemove 
}) => {
  const IconComponent = widget.icon ? iconMap[widget.icon] : Package;
  
  // Dynamic styling based on theme and widget configuration
  const getColorClasses = () => {
    const colorMap: Record<string, { border: string, hover: string, text: string, iconColor: string }> = {
      'amber': { 
        border: 'border-amber-200', 
        hover: 'hover:border-amber-300', 
        text: 'text-amber-600',
        iconColor: 'text-amber-500'
      },
      'green': { 
        border: 'border-green-200', 
        hover: 'hover:border-green-300', 
        text: 'text-green-600',
        iconColor: 'text-green-500'
      },
      'red': { 
        border: 'border-red-200', 
        hover: 'hover:border-red-300', 
        text: 'text-red-600',
        iconColor: 'text-red-500'
      },
      'blue': { 
        border: 'border-blue-200', 
        hover: 'hover:border-blue-300', 
        text: 'text-blue-600',
        iconColor: 'text-blue-500'
      },
      'indigo': { 
        border: 'border-indigo-200', 
        hover: 'hover:border-indigo-300', 
        text: 'text-indigo-600',
        iconColor: 'text-indigo-500'
      },
      'purple': { 
        border: 'border-purple-200', 
        hover: 'hover:border-purple-300', 
        text: 'text-purple-600',
        iconColor: 'text-purple-500'
      },
    };
    
    const color = widget.color || 'blue';
    return colorMap[color] || colorMap.blue;
  };
  
  const colorClasses = getColorClasses();
  
  // Size classes
  const getSizeClasses = () => {
    const sizeMap: Record<string, string> = {
      'small': 'col-span-1',
      'medium': 'col-span-2',
      'large': 'col-span-3',
      'full': 'col-span-full',
    };
    
    return sizeMap[widget.size] || sizeMap.small;
  };
  
  return (
    <div 
      className={`
        ${getSizeClasses()} 
        bg-white rounded-lg shadow-md p-5 border ${colorClasses.border} 
        ${!isEditing ? `cursor-pointer ${colorClasses.hover} transition-shadow duration-200` : ''}
        ${isEditing ? 'ring-2 ring-blue-400' : ''}
        relative
      `}
      onClick={isEditing ? undefined : onClick}
      title={isEditing ? 'Edit widget' : `View ${widget.title.toLowerCase()}`}
    >
      <h3 className="text-slate-500 text-sm font-medium mb-1">{widget.title}</h3>
      <p className={`text-3xl font-bold ${colorClasses.text}`}>{count}</p>
      <div className="flex items-center text-sm text-slate-600 mt-1">
        <IconComponent className={`h-4 w-4 mr-1 ${colorClasses.iconColor}`} />
        {description || 'No description'}
      </div>
      
      {isEditing && (
        <div className="absolute top-1 right-1 flex space-x-1">
          <button 
            onClick={onEdit}
            className="p-1 text-slate-400 hover:text-slate-600 bg-white rounded"
          >
            <Settings size={16} />
          </button>
          <button 
            onClick={onRemove}
            className="p-1 text-slate-400 hover:text-red-500 bg-white rounded"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

interface DashboardWidgetsProps {
  packageCounts: Record<string, number>;
  onCardClick: (status: string) => void;
  onReturnableClick: () => void;
}

export const DashboardWidgets: React.FC<DashboardWidgetsProps> = ({ 
  packageCounts, 
  onCardClick,
  onReturnableClick
}) => {
  const { config, isEditing, updateWidget } = useDashboard();
  
  // Sort widgets by order
  const sortedWidgets = [...config.widgets]
    .filter(widget => widget.enabled)
    .sort((a, b) => a.order - b.order);
    
  const handleWidgetEdit = (widgetId: string) => {
    // This would open a modal to edit widget properties
    console.log('Edit widget:', widgetId);
  };
  
  const handleWidgetRemove = (widgetId: string) => {
    updateWidget(widgetId, { enabled: false });
  };
  
  // Get the appropriate grid layout based on config
  const getLayoutClasses = () => {
    switch(config.layout) {
      case 'list':
        return 'flex flex-col gap-4';
      case 'compact':
        return 'grid grid-cols-2 md:grid-cols-5 gap-2';
      case 'grid':
      default:
        return 'grid grid-cols-1 md:grid-cols-5 gap-4';
    }
  };
  
  // Helper function to check if status is a valid string
  const isValidStatus = (status: string | undefined): status is string => {
    return typeof status === 'string' && status.length > 0;
  };

  return (
    <div className={`${getLayoutClasses()} mb-8`}>
      {sortedWidgets.map(widget => {
        if (widget.type === 'status-card' && isValidStatus(widget.status)) {
          // Calculate count (defaulting to 0)
          const count = packageCounts[widget.status] || 0;
          
          let description = '';
          switch(widget.status) {
            case 'submitted':
              description = 'Awaiting approval';
              break;
            case 'approved':
              description = 'Ready for dispatch';
              break;
            case 'rejected':
              description = 'Not approved';
              break;
            case 'dispatched':
              description = 'Successfully delivered';
              break;
            default:
              description = 'Packages';
          }
          
          return (
            <StatusCard
              key={widget.id}
              widget={widget}
              count={count}
              description={description}
              onClick={() => widget.status && onCardClick(widget.status)}
              isEditing={isEditing}
              onEdit={() => handleWidgetEdit(widget.id)}
              onRemove={() => handleWidgetRemove(widget.id)}
            />
          );
        }
        
        // Special case for returnable packages
        if (widget.id === 'returnable-packages') {
          // Since we know this is the returnable-packages widget, we can safely use its ID
          return (
            <div 
              key="returnable-packages"
              className={`
                col-span-1
                bg-white rounded-lg shadow-md p-5 border border-indigo-200 
                ${!isEditing ? 'cursor-pointer hover:border-indigo-300 transition-shadow duration-200' : ''}
                ${isEditing ? 'ring-2 ring-blue-400' : ''}
                relative
              `}
              onClick={isEditing ? undefined : onReturnableClick}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-slate-500 text-sm font-medium mb-1">{widget.title}</h3>
                  <p className="text-2xl font-bold text-indigo-600">
                    {packageCounts.returnable || 0}
                  </p>
                </div>
                <RefreshCw className="h-8 w-8 text-indigo-400" />
              </div>
              <div className="text-sm text-slate-600 mt-1">
                Packages marked for return
              </div>
              
              {isEditing && (
                <div className="absolute top-1 right-1 flex space-x-1">
                  <button 
                    onClick={() => handleWidgetEdit('returnable-packages')}
                    className="p-1 text-slate-400 hover:text-slate-600 bg-white rounded"
                  >
                    <Settings size={16} />
                  </button>
                  <button 
                    onClick={() => handleWidgetRemove('returnable-packages')}
                    className="p-1 text-slate-400 hover:text-red-500 bg-white rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          );
        }
        
        return null;
      })}
    </div>
  );
};
