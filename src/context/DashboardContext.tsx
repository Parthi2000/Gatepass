import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DashboardConfig, defaultDashboardConfig } from '../types/dashboard';

interface DashboardContextType {
  config: DashboardConfig;
  updateConfig: (newConfig: Partial<DashboardConfig>) => void;
  updateWidget: (widgetId: string, updates: Partial<any>) => void;
  resetToDefaults: () => void;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Try to load config from localStorage, fall back to default
  const [config, setConfig] = useState<DashboardConfig>(() => {
    const savedConfig = localStorage.getItem('employeeDashboardConfig');
    if (savedConfig) {
      try {
        return JSON.parse(savedConfig);
      } catch (error) {
        console.error('Error parsing dashboard config:', error);
        return defaultDashboardConfig;
      }
    }
    return defaultDashboardConfig;
  });

  const [isEditing, setIsEditing] = useState(false);

  // Save config to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('employeeDashboardConfig', JSON.stringify(config));
  }, [config]);

  // Update entire config or parts of it
  const updateConfig = (newConfig: Partial<DashboardConfig>) => {
    setConfig(prevConfig => ({
      ...prevConfig,
      ...newConfig,
    }));
  };

  // Update a specific widget
  const updateWidget = (widgetId: string, updates: Partial<any>) => {
    setConfig(prevConfig => ({
      ...prevConfig,
      widgets: prevConfig.widgets.map(widget => 
        widget.id === widgetId
          ? { ...widget, ...updates }
          : widget
      ),
    }));
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setConfig(defaultDashboardConfig);
  };

  return (
    <DashboardContext.Provider value={{ 
      config, 
      updateConfig, 
      updateWidget, 
      resetToDefaults,
      isEditing,
      setIsEditing
    }}>
      {children}
    </DashboardContext.Provider>
  );
};

// Custom hook to use the dashboard context
export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
