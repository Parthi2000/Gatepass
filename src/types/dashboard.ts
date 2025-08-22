// Types for dashboard customization
export interface DashboardWidgetConfig {
  id: string;
  type: 'status-card' | 'package-list' | 'form' | 'custom';
  title: string;
  enabled: boolean;
  order: number;
  size: 'small' | 'medium' | 'large' | 'full';
  color?: string;
  status?: string;
  icon?: string;
}

export interface DashboardConfig {
  layout: 'grid' | 'list' | 'compact';
  colorTheme: 'default' | 'blue' | 'green' | 'purple' | 'dark';
  defaultView: 'recent' | 'all';
  widgets: DashboardWidgetConfig[];
  refreshInterval: number; // in seconds
  showPendingOnly: boolean; // only show pending packages
}

// Default configuration
export const defaultDashboardConfig: DashboardConfig = {
  layout: 'grid',
  colorTheme: 'default',
  defaultView: 'recent',
  refreshInterval: 30,
  showPendingOnly: false,
  widgets: [
    {
      id: 'pending-packages',
      type: 'status-card',
      title: 'Pending Packages',
      enabled: true,
      order: 0,
      size: 'small',
      status: 'submitted',
      color: 'amber',
      icon: 'Clock',
    },
    {
      id: 'approved-packages',
      type: 'status-card',
      title: 'Approved Packages',
      enabled: true,
      order: 1,
      size: 'small',
      status: 'approved',
      color: 'green',
      icon: 'CheckCircle',
    },
    {
      id: 'rejected-packages',
      type: 'status-card',
      title: 'Rejected Packages',
      enabled: true,
      order: 2,
      size: 'small',
      status: 'rejected',
      color: 'red',
      icon: 'XCircle',
    },
    {
      id: 'dispatched-packages',
      type: 'status-card',
      title: 'Dispatched Packages',
      enabled: true,
      order: 3,
      size: 'small',
      status: 'dispatched',
      color: 'blue',
      icon: 'SendToBack',
    },
    {
      id: 'returnable-packages',
      type: 'package-list',
      title: 'Returnable Packages',
      enabled: true,
      order: 4,
      size: 'full',
      color: 'indigo',
      icon: 'RefreshCw',
    },
    {
      id: 'package-form',
      type: 'form',
      title: 'Submit New Package',
      enabled: true,
      order: 5,
      size: 'large',
      icon: 'PackagePlus',
    },
  ],
};
