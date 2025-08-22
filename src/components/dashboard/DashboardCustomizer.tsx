import React, { useState } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { DashboardWidgetConfig } from '../../types/dashboard';
import { Settings, X, Save, RotateCcw, Plus, PaintBucket, Layout } from 'lucide-react';

interface WidgetEditorProps {
  widget: DashboardWidgetConfig;
  onUpdate: (updates: Partial<DashboardWidgetConfig>) => void;
  onClose: () => void;
}

export const WidgetEditor: React.FC<WidgetEditorProps> = ({ widget, onUpdate, onClose }) => {
  const [editedWidget, setEditedWidget] = useState<DashboardWidgetConfig>({...widget});
  
  const handleChange = (field: keyof DashboardWidgetConfig, value: any) => {
    setEditedWidget(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSave = () => {
    onUpdate(editedWidget);
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Edit Widget</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X size={18} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input
              type="text"
              value={editedWidget.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full border border-slate-200 rounded p-2"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Size</label>
              <select
                value={editedWidget.size}
                onChange={(e) => handleChange('size', e.target.value)}
                className="w-full border border-slate-200 rounded p-2"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="full">Full Width</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
              <select
                value={editedWidget.color}
                onChange={(e) => handleChange('color', e.target.value)}
                className="w-full border border-slate-200 rounded p-2"
              >
                <option value="blue">Blue</option>
                <option value="green">Green</option>
                <option value="red">Red</option>
                <option value="amber">Amber</option>
                <option value="indigo">Indigo</option>
                <option value="purple">Purple</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Order</label>
            <input
              type="number"
              min="0"
              value={editedWidget.order}
              onChange={(e) => handleChange('order', parseInt(e.target.value))}
              className="w-full border border-slate-200 rounded p-2"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="widget-enabled"
              checked={editedWidget.enabled}
              onChange={(e) => handleChange('enabled', e.target.checked)}
              className="h-4 w-4 text-blue-600 border-slate-300 rounded"
            />
            <label htmlFor="widget-enabled" className="ml-2 block text-sm text-slate-700">
              Enabled
            </label>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-3 py-2 border border-slate-200 text-slate-700 rounded hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
          >
            <Save size={16} className="mr-1" /> Save
          </button>
        </div>
      </div>
    </div>
  );
};

interface DashboardControlsProps {
  onAddWidget: () => void;
}

export const DashboardControls: React.FC<DashboardControlsProps> = ({ onAddWidget }) => {
  const { isEditing, setIsEditing, resetToDefaults, config, updateConfig } = useDashboard();
  const [showThemeModal, setShowThemeModal] = useState(false);
  
  const toggleEdit = () => {
    setIsEditing(!isEditing);
  };
  
  const cycleLayout = () => {
    const layouts = ['grid', 'list', 'compact'];
    const currentIndex = layouts.indexOf(config.layout);
    const nextIndex = (currentIndex + 1) % layouts.length;
    const nextLayout = layouts[nextIndex] as 'grid' | 'list' | 'compact';
    
    updateConfig({
      layout: nextLayout
    });
    
    console.log(`Layout changed to: ${nextLayout}`);
  };
  
  return (
    <div className="flex justify-between items-center mb-6">
      <div className="flex-1">
        {isEditing && (
          <div className="bg-blue-50 p-2 rounded-md text-blue-600 text-sm">
            <span className="font-medium">Edit Mode:</span> Click on widgets to edit or rearrange them
          </div>
        )}
      </div>
      <div className="flex space-x-2">
        <div className="flex border border-slate-200 rounded-md overflow-hidden">
          {isEditing && (
            <button
              onClick={onAddWidget}
              className="px-4 py-2 bg-white text-slate-600 hover:bg-slate-50 border-r border-slate-200 flex items-center"
              title="Add widget"
            >
              <Plus size={16} className="mr-1" /> Add Widget
            </button>
          )}
          <button
            onClick={() => setShowThemeModal(true)}
            className="px-4 py-2 bg-white text-slate-600 hover:bg-slate-50 border-r border-slate-200 flex items-center"
            title="Change theme"
          >
            <PaintBucket size={16} className="mr-1" /> Theme
          </button>
          <button
            onClick={cycleLayout}
            className="px-4 py-2 bg-white text-slate-600 hover:bg-slate-50 border-r border-slate-200 flex items-center"
            title={`Current layout: ${config.layout}. Click to change`}
          >
            <Layout size={16} className="mr-1" /> Layout
          </button>
          <button
            onClick={resetToDefaults}
            className="px-4 py-2 bg-white text-slate-600 hover:bg-slate-50 flex items-center"
            title="Reset to default layout"
          >
            <RotateCcw size={16} className="mr-1" /> Reset
          </button>
        </div>
        
        <button
          onClick={toggleEdit}
          className={`px-3 py-1.5 ${isEditing ? 'bg-blue-500 text-white' : 'bg-white border border-slate-200'} text-sm rounded flex items-center ${isEditing ? 'hover:bg-blue-600' : 'hover:bg-slate-50'}`}
          title={isEditing ? "Save changes" : "Customize dashboard"}
        >
          {isEditing ? (
            <>
              <Save size={16} className="mr-1" /> Done
            </>
          ) : (
            <>
              <Settings size={16} className="mr-1" /> Customize
            </>
          )}
        </button>
      </div>
      
      {showThemeModal && (
        <ThemeCustomizer 
          onClose={() => setShowThemeModal(false)} 
        />
      )}
    </div>
  );
};

interface ThemeCustomizerProps {
  onClose: () => void;
}

const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({ onClose }) => {
  const { config, updateConfig } = useDashboard();
  const [selectedTheme, setSelectedTheme] = useState(config.colorTheme);
  const [selectedLayout, setSelectedLayout] = useState(config.layout);
  
  const applyChanges = () => {
    updateConfig({
      colorTheme: selectedTheme,
      layout: selectedLayout,
    });
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Customize Dashboard</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X size={18} />
          </button>
        </div>
        
        <div className="space-y-5">
          <div>
            <h4 className="font-medium mb-2 flex items-center">
              <PaintBucket size={16} className="mr-1" /> Color Theme
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {['default', 'blue', 'green', 'purple', 'dark'].map(theme => (
                <button
                  key={theme}
                  onClick={() => setSelectedTheme(theme as any)}
                  className={`
                    p-3 rounded text-center capitalize
                    ${selectedTheme === theme ? 'ring-2 ring-blue-400' : 'border border-slate-200'}
                    ${theme === 'dark' ? 'bg-slate-800 text-white' : theme === 'blue' ? 'bg-blue-50' : theme === 'green' ? 'bg-green-50' : theme === 'purple' ? 'bg-purple-50' : 'bg-white'}
                  `}
                >
                  {theme}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-2 flex items-center">
              <Layout size={16} className="mr-1" /> Layout
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {['grid', 'list', 'compact'].map(layout => (
                <button
                  key={layout}
                  onClick={() => setSelectedLayout(layout as any)}
                  className={`
                    p-3 rounded text-center capitalize
                    ${selectedLayout === layout ? 'ring-2 ring-blue-400' : 'border border-slate-200'}
                  `}
                >
                  {layout}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-3 py-2 border border-slate-200 text-slate-700 rounded hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={applyChanges}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
          >
            <Save size={16} className="mr-1" /> Apply
          </button>
        </div>
      </div>
    </div>
  );
};

interface AddWidgetModalProps {
  onClose: () => void;
  onAddWidget: (widget: DashboardWidgetConfig) => void;
}

export const AddWidgetModal: React.FC<AddWidgetModalProps> = ({ onClose, onAddWidget }) => {
  const [widgetType, setWidgetType] = useState<string>('status-card');
  const [widgetTitle, setWidgetTitle] = useState<string>('');
  const [widgetStatus, setWidgetStatus] = useState<string>('submitted');
  
  const handleAdd = () => {
    if (!widgetTitle) return;
    
    const newWidget: DashboardWidgetConfig = {
      id: `widget-${Date.now()}`,
      type: widgetType as any,
      title: widgetTitle,
      enabled: true,
      order: 999, // Will be placed at the end
      size: 'small',
      color: 'blue',
      status: widgetStatus,
      icon: widgetType === 'status-card' ? 'Package' : 'Clock',
    };
    
    onAddWidget(newWidget);
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Add New Widget</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X size={18} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Widget Type</label>
            <select
              value={widgetType}
              onChange={(e) => setWidgetType(e.target.value)}
              className="w-full border border-slate-200 rounded p-2"
            >
              <option value="status-card">Status Card</option>
              <option value="package-list">Package List</option>
              <option value="custom">Custom Widget</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Widget Title</label>
            <input
              type="text"
              value={widgetTitle}
              onChange={(e) => setWidgetTitle(e.target.value)}
              placeholder="Enter widget title"
              className="w-full border border-slate-200 rounded p-2"
            />
          </div>
          
          {widgetType === 'status-card' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={widgetStatus}
                onChange={(e) => setWidgetStatus(e.target.value)}
                className="w-full border border-slate-200 rounded p-2"
              >
                <option value="submitted">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="dispatched">Dispatched</option>
              </select>
            </div>
          )}
        </div>
        
        <div className="mt-6 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-3 py-2 border border-slate-200 text-slate-700 rounded hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!widgetTitle}
            className={`px-4 py-2 ${!widgetTitle ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded flex items-center`}
          >
            <Plus size={16} className="mr-1" /> Add Widget
          </button>
        </div>
      </div>
    </div>
  );
};
