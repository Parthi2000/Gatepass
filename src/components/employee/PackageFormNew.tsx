import React, { useState, useEffect } from 'react';
import { usePackages } from '../../context/PackageContext';
// We need the Package type for type checking in submitPackage
// @ts-ignore - This type is used for type annotations
import type { Package } from '../../types';
import { 
  Send, 
  RotateCcw, 
  AlertCircle, 
  Truck, 
  Calendar, 
  Box,
  Plus,
  PackageIcon,
  Check,
  Scale,
  ImageIcon
} from 'lucide-react';
import { generateGatePassNumber } from '../../utils/gatePassGenerator';
import { ItemFormSection } from './ItemFormSection';
import type { PackageItemSubmission, PackageCommonInfo } from '../../types/item';

interface PackageFormProps {
  onSubmit?: (packageData: any) => void;
  packageToResubmit?: any; // Prop to accept a rejected package
  resetResubmission?: () => void; // Function to clear the resubmission state
}

const PackageFormNew: React.FC<PackageFormProps> = ({ onSubmit, packageToResubmit, resetResubmission }) => {
  const { submitPackage, managers } = usePackages();
  const [imageBeforePacking, setImageBeforePacking] = useState<File[]>([]);
  const [imageAfterPacking, setImageAfterPacking] = useState<File[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const initialFormData = {
    // Basic package information
    remarks: '',
    recipient: '',
    projectCode: '',
    poNumber: '',
    poDate: '',
    notes: '',
    priority: 'medium',
    toAddress: '',
    managerId: '',
    
    // Gate pass information
    gatePassSerialNumber: '', // Will be auto-generated
    date: new Date().toISOString().substr(0, 10), // Today's date in YYYY-MM-DD format
    
    // Returnable information
    isReturnable: false,
    returnDate: '',
    returnReason: '',
    
    // Transportation details
    transportationType: 'courier', // 'courier' or 'byHand'
    vehicleDetails: '',
    courierName: '',
    courierTrackingNumber: '',
    carrierName: '',
    
    // Package details
    numberOfPackages: 1,
  };
  
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // State for multiple items
  const [items, setItems] = useState<PackageItemSubmission[]>([{
    serialNumber: '',
    hsnCode: '',
    quantity: 1,
    unitPrice: '',
    description: ''
  }]);
  
  // State for common info shared across all items
  const [commonInfo, setCommonInfo] = useState<PackageCommonInfo>({
    weight: '',
    weightUnit: 'kg',
    dimension: '',
    purpose: ''
  });

  // State for additional weight sections
  const [additionalSections, setAdditionalSections] = useState<Array<{
    id: number;
    weight: string;
    weightUnit: string;
    dimension: string;
    purpose: string;
  }>>([]);

  // Add a new weight section
  const addWeightSection = () => {
    setAdditionalSections(prev => [
      ...prev,
      {
        id: Date.now(),
        weight: '',
        weightUnit: 'kg',
        dimension: '',
        purpose: ''
      }
    ]);
  };

  // Handle changes in additional sections
  const handleAdditionalSectionChange = (id: number, field: string, value: string) => {
    setAdditionalSections(prev =>
      prev.map(section =>
        section.id === id ? { ...section, [field]: value } : section
      )
    );
  };

  // Remove a weight section
  const removeWeightSection = (id: number) => {
    setAdditionalSections(prev => prev.filter(section => section.id !== id));
  };
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);


  
  // When packageToResubmit changes, update the form with the rejected package data
  useEffect(() => {
    if (packageToResubmit) {
      // Reset image states for resubmission
      setImageBeforePacking([]);
      setImageAfterPacking([]);
      setFormData({
        // Basic package information
        remarks: packageToResubmit.remarks || '',
        recipient: packageToResubmit.recipient || '',
        projectCode: packageToResubmit.projectCode || '',
        poNumber: packageToResubmit.poNumber || '',
        poDate: packageToResubmit.poDate || '',
        notes: packageToResubmit.notes || '',
        priority: packageToResubmit.priority || 'medium',
        toAddress: packageToResubmit.toAddress || '',
        managerId: packageToResubmit.assignedToManager || packageToResubmit.assigned_to_manager || '',
        
        // Gate pass information
        gatePassSerialNumber: packageToResubmit.gatePassSerialNumber || packageToResubmit.gate_pass_serial_number || '',
        date: packageToResubmit.date || new Date().toISOString().substr(0, 10),
        
        // Returnable information
        isReturnable: packageToResubmit.isReturnable || false,
        returnDate: packageToResubmit.returnDate || '',
        returnReason: packageToResubmit.returnReason || '',
        
        // Transportation details
        transportationType: packageToResubmit.transportationType || 'courier',
        vehicleDetails: packageToResubmit.vehicleDetails || '',
        courierName: packageToResubmit.courierName || '',
        courierTrackingNumber: packageToResubmit.courierTrackingNumber || '',
        carrierName: packageToResubmit.carrierName || '',
        
        // Package details
        numberOfPackages: packageToResubmit.numberOfPackages || 1,
      });
      
      // Extract common info from first item or package itself
      setCommonInfo({
        weight: packageToResubmit.items?.[0]?.weight || packageToResubmit.weight || '',
        weightUnit: packageToResubmit.items?.[0]?.weightUnit || packageToResubmit.weightUnit || 'kg',
        purpose: packageToResubmit.items?.[0]?.purpose || packageToResubmit.purpose || ''
      });
      
      if (packageToResubmit.items && packageToResubmit.items.length > 0) {
        setItems(packageToResubmit.items.map((item: any) => ({
          serialNumber: item.serialNumber || '',
          hsnCode: item.hsnCode || '',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || '',
          taxableValue: item.taxableValue || ''
        })));
      } else {
        // If no items, create a default item using the package's item details
        setItems([{
          serialNumber: packageToResubmit.serialNumber || '',
          hsnCode: packageToResubmit.hsnCode || '',
          quantity: packageToResubmit.quantity || 1,
          unitPrice: packageToResubmit.unitPrice || '',
          taxableValue: packageToResubmit.taxableValue || ''
        }]);
      }
      
      // Set focus to the form and scroll to it
      const formElement = document.getElementById('package-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth' });
        const firstInput = formElement.querySelector('input, textarea') as HTMLElement;
        if (firstInput) firstInput.focus();
      }
      
      if (resetResubmission) {
        // Reset the resubmission state in the parent after we've loaded the data
        setTimeout(() => {
          resetResubmission();
        }, 100);
      }
    }
  }, [packageToResubmit, resetResubmission]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'file') {
      const files = (e.target as HTMLInputElement).files;
      if (name === 'imageBeforePacking') {
        setImageBeforePacking(files ? Array.from(files) : []);
      } else if (name === 'imageAfterPacking') {
        setImageAfterPacking(files ? Array.from(files) : []);
      }
      return;
    }
    
    // Handle checkbox inputs
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prevData => ({
        ...prevData,
        [name]: checked
      }));
      return;
    }
    
    // Handle date inputs - ensure we only store the date part
    if (type === 'date') {
      setFormData(prevData => ({
        ...prevData,
        [name]: value // value is already in YYYY-MM-DD format from date input
      }));
      return;
    }
    
    // Handle number inputs
    if (type === 'number') {
      const numberValue = value === '' ? '' : Number(value);
      setFormData(prevData => ({
        ...prevData,
        [name]: numberValue
      }));
      return;
    }
    
    // Handle all other inputs
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };
  
  // Handle changes to individual items
  const handleItemChange = (index: number, updates: Partial<PackageItemSubmission>) => {
    const newItems = [...items];
    // Convert empty strings to null for numeric fields
    if ('taxableValue' in updates && updates.taxableValue === '') {
      updates.taxableValue = '0';
    }
    if ('unitPrice' in updates && updates.unitPrice === '') {
      updates.unitPrice = '0';
    }
    newItems[index] = { ...newItems[index], ...updates };
    setItems(newItems);
  };

  // Handle changes to common info fields
  const handleCommonInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCommonInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Function to handle changes is now directly managed in ItemFormSection component

  // Add a new item to the items array
  const addNewItem = () => {
    setItems([...items, {
      serialNumber: '',
      hsnCode: '',
      quantity: 1,
      unitPrice: '',
      description: ''
    }]);
  };

  // Remove an item from the items array
  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(currentItems => {
        const newItems = [...currentItems];
        newItems.splice(index, 1);
        return newItems;
      });
    }
  };
  
  // First validation step - shows confirmation dialog if validation passes
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrors({});
    
    const newErrors: Record<string, string> = {};
    
    // Validate required fields
    if (!formData.recipient.trim()) {
      newErrors.recipient = 'Recipient name is required';
    }
    // Destination is now optional, no validation needed
    if (!formData.managerId) {
      newErrors.managerId = 'Please select a manager';
    }
    
    // PO Number and PO Date are optional, but if provided, validate format
    if (formData.poDate && new Date(formData.poDate) > new Date()) {
      newErrors.poDate = 'PO Date cannot be in the future';
    }
    
    // If there are validation errors, update the state and return
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    try {
      if (formData.isReturnable && formData.returnDate) {
        // Only validate return date if it's provided
        const returnDate = new Date(formData.returnDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
        
        if (returnDate < today) {
          throw new Error('Return date must be in the future');
        }
      }
      // Vehicle details are now optional for hand-delivered packages
      // No validation needed for vehicleDetails or carrierName
      
      // Validate items
      if (items.length === 0) {
        throw new Error('Please add at least one item to the package');
      }
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.serialNumber) {
          throw new Error(`Please enter a serial number for item ${i + 1}`);
        }
        // HSN code is now optional
        if (!item.quantity || item.quantity <= 0) {
          throw new Error(`Please enter a valid quantity for item ${i + 1}`);
        }
      }
      
      // Weight is now optional, no validation needed
      
      // If validation passes, show confirmation dialog
      setShowConfirmation(true);
      
    } catch (error) {
      console.error('Validation error:', error);
      setError(typeof error === 'object' && error !== null && 'message' in error ? String((error as { message: unknown }).message) : 'An unexpected error occurred');
    }
  };

  // Final submission after user confirms
  const finalizeSubmission = async () => {
    setIsSubmitting(true);
    setShowConfirmation(false);
    
    try {
      console.log('Submitting package - Form state:', formData);
      console.log('Items:', items);
      console.log('Common Info:', commonInfo);
      console.log('Image Before Packing:', imageBeforePacking.map(file => file.name));
      console.log('Image After Packing:', imageAfterPacking.map(file => file.name));

      const payload = new FormData();

      // Generate tracking number (now async)
      const trackingNumber = await generateGatePassNumber(formData.isReturnable || false);
      payload.append('tracking_number', trackingNumber);

      // Add required fields
      payload.append('recipient', formData.recipient);
      const toAddress = formData.toAddress || 'N/A';
      payload.append('to_address', toAddress);
      payload.append('project_code', formData.projectCode || 'GENERAL');

     // Add optional fields
      if (formData.remarks) payload.append('remarks', formData.remarks);
      if (formData.notes) payload.append('notes', formData.notes);
      payload.append('priority', formData.priority);
      if (formData.managerId) payload.append('assigned_to_manager', formData.managerId);
      payload.append('gate_pass_serial_number', formData.gatePassSerialNumber || trackingNumber);
      // Using to_address field for the package destination
      payload.append('is_returnable', String(formData.isReturnable));
      if (formData.returnDate) payload.append('return_date', formData.returnDate);
      if (formData.returnReason) payload.append('return_reason', formData.returnReason);
      if (formData.courierName) payload.append('courier_name', formData.courierName);
      if (formData.courierTrackingNumber) payload.append('courier_tracking_number', formData.courierTrackingNumber);
      
      // Transportation details
      payload.append('transportation_type', formData.transportationType);
      if (formData.vehicleDetails) payload.append('vehicle_details', formData.vehicleDetails);
      if (formData.carrierName) payload.append('carrier_name', formData.carrierName);
      payload.append('number_of_packages', String(formData.numberOfPackages));
      if (formData.poNumber) payload.append('po_number', formData.poNumber);
      if (formData.poDate) payload.append('po_date', formData.poDate);
      


      // Prepare dimension data as array (common info + additional sections)
      const dimensionData = [];
      
      // Add common info if it has weight or dimension
      if (commonInfo.weight || commonInfo.dimension) {
        dimensionData.push({
          weight: commonInfo.weight || null,
          weight_unit: commonInfo.weightUnit || 'kg',
          dimension: commonInfo.dimension || null,
          purpose: commonInfo.purpose || null
        });
      }
      
      // Add additional sections
      additionalSections.forEach(section => {
        if (section.weight || section.dimension) {
          dimensionData.push({
            weight: section.weight || null,
            weight_unit: section.weightUnit || 'kg',
            dimension: section.dimension || null,
            purpose: section.purpose || null
          });
        }
      });
      
      // Send dimension data as JSON array
      if (dimensionData.length > 0) {
        payload.append('dimensions', JSON.stringify(dimensionData));
      }
      
      // Prepare items with correct field names (camelCase to snake_case)
      // Note: weight, weight_unit, and dimension are now stored at package level, not item level
      const preparedItems = items.map(item => ({
        serial_number: item.serialNumber,
        hsn_code: item.hsnCode,
        unit_price: item.unitPrice ? parseFloat(item.unitPrice) : null,
        quantity: item.quantity ? parseInt(item.quantity.toString(), 10) : 1,
        description: item.description || '',
        value: item.unitPrice && item.quantity ? 
          (parseFloat(item.unitPrice) * parseInt(item.quantity.toString(), 10)) : 0
      }));
      
      console.log('Prepared items for submission:', preparedItems);
      
      // Append items as JSON string
      payload.append('items', JSON.stringify(preparedItems));

      // Append files
      console.log('Image before packing files:', imageBeforePacking);
      console.log('Image after packing files:', imageAfterPacking);
      imageBeforePacking.forEach(file => payload.append('image_before_packing', file));
      imageAfterPacking.forEach(file => payload.append('image_after_packing', file));

      // Append resubmission fields if applicable
      if (packageToResubmit) {
        payload.append('resubmitted', 'true');
        payload.append('previousRejection', String(packageToResubmit.id));
      } else {
        payload.append('resubmitted', 'false');
      }
      
      // Submit package with FormData
      const submittedPackage = await submitPackage(payload);
      console.log('Package submitted successfully:', submittedPackage);
      
      // Reset the form
      setFormData({
        ...initialFormData,
        date: new Date().toISOString().substr(0, 10)
      });
      
      // Reset items
      setItems([{
        serialNumber: '',
        hsnCode: '',
        quantity: 1,
        unitPrice: '',
        description: ''
      }]);
      
      // Reset common info
      setCommonInfo({
        weight: '',
        weightUnit: 'kg',
        dimension: '',
        purpose: ''
      });
      
      // Reset additional sections
      setAdditionalSections([]);
      // Reset images
      setImageBeforePacking([]);
      setImageAfterPacking([]);
      // Clear file input fields visually (optional, browser dependent)
      const fileInputBefore = document.getElementById('imageBeforePacking') as HTMLInputElement;
      if (fileInputBefore) fileInputBefore.value = '';
      const fileInputAfter = document.getElementById('imageAfterPacking') as HTMLInputElement;
      if (fileInputAfter) fileInputAfter.value = '';
      
      // If this was a resubmission, clear the resubmission state in parent
      if (packageToResubmit && resetResubmission) {
        resetResubmission();
      }
      
      // If an onSubmit callback was provided, call it with the submitted package
      if (onSubmit) {
        onSubmit(submittedPackage);
      }
      
      // Show success message
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
      
    } catch (error) {
      console.error('Error submitting package:', error);
      setError(typeof error === 'object' && error !== null && 'message' in error ? String((error as { message: unknown }).message) : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-sm">
      <div className="flex items-center mb-6">
        <PackageIcon className="h-6 w-6 text-blue-600 mr-2" />
        <h2 className="text-2xl font-bold text-slate-800">
          {packageToResubmit ? 'Resubmit Package' : 'Create New Package'}
        </h2>
      </div>
      
      <div className="space-y-6">
      
      {showSuccess && (
        <div className="mb-4 p-3 bg-green-100 border border-green-200 text-green-700 rounded-md flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>Package submitted successfully! Your package has been assigned to the selected manager for approval.</span>
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-md flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span><strong>Error:</strong> {error}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Section: Basic Package Information */}
        <div className="border-b border-slate-200 pb-4 mb-4">
          <h3 className="text-md font-semibold text-slate-700 mb-3 flex items-center">
            <PackageIcon className="h-4 w-4 mr-2 text-blue-500" />
            Basic Package Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="recipient" className="block mb-1 text-sm font-medium text-slate-700">
                Consignee Name*
              </label>
              <input
                type="text"
                id="recipient"
                name="recipient"
                value={formData.recipient}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Marketing Department, John Doe"
              />
            </div>
            
            <div>
              <label htmlFor="projectCode" className="block mb-1 text-sm font-medium text-slate-700">
                Project Code
              </label>
              <input
                type="text"
                id="projectCode"
                name="projectCode"
                value={formData.projectCode}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., PROJ001, DEV123, CODE456"
              />
            </div>
          </div>
          
          <div className="mt-3">
            <label htmlFor="toAddress" className="block mb-1 text-sm font-medium text-slate-700">
              To Address (Detailed Address)*
            </label>
            <textarea
              id="toAddress"
              name="toAddress"
              value={formData.toAddress}
              onChange={handleChange}
              required
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Full delivery address including building, street, city, etc."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div>
              <label htmlFor="poNumber" className="block mb-1 text-sm font-medium text-slate-700">
                PO Number
              </label>
              <input
                type="text"
                id="poNumber"
                name="poNumber"
                value={formData.poNumber}
                onChange={handleChange}
                className={`w-full px-3 py-2 border ${errors.poNumber ? 'border-red-500' : 'border-slate-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="e.g., PO-12345 (optional)"
              />
              {errors.poNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.poNumber}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="poDate" className="block mb-1 text-sm font-medium text-slate-700">
                PO Date
              </label>
              <input
                type="date"
                id="poDate"
                name="poDate"
                value={formData.poDate}
                onChange={handleChange}
                className={`w-full px-3 py-2 border ${errors.poDate ? 'border-red-500' : 'border-slate-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                max={new Date().toISOString().split('T')[0]} // Prevent future dates
              />
              {errors.poDate && (
                <p className="mt-1 text-sm text-red-600">{errors.poDate}</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
            <div>
              <label htmlFor="priority" className="block mb-1 text-sm font-medium text-slate-700">
                Priority Level
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="numberOfPackages" className="block mb-1 text-sm font-medium text-slate-700">
                Number of Packages*
              </label>
              <input
                type="number"
                id="numberOfPackages"
                name="numberOfPackages"
                min="1"
                value={formData.numberOfPackages}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 1, 2, 3"
              />
            </div>
            
            <div>
              <label htmlFor="managerId" className="block mb-1 text-sm font-medium text-slate-700">
                Assign to Manager*
              </label>
              <select
                id="managerId"
                name="managerId"
                value={formData.managerId}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a manager</option>
                {managers.map(manager => (
                  <option key={manager.id} value={manager.id}>
                    {manager.fullName || manager.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div>
              <label htmlFor="date" className="block mb-1 text-sm font-medium text-slate-700">
                <Calendar className="inline h-4 w-4 mr-1" />
                Submission Date*
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* <div>
              <label htmlFor="gatePassSerialNumber" className="block mb-1 text-sm font-medium text-slate-700">
                Gate Pass Serial Number
              </label>
              <div className="text-xs text-slate-500 mb-1">
                Auto-generated with format: RAPL-GP-TYPE-Financial-Year-001
              </div>
              <div className="bg-slate-100 px-3 py-2 border border-slate-300 rounded-md text-slate-700">
                {formData.gatePassSerialNumber || 'Will be generated on submission'}
              </div>
            </div> */}

            <div>
              <label htmlFor="remarks" className="block mb-1 text-sm font-medium text-slate-700">
                Remarks
              </label>
              <input
                type="text"
                id="remarks"
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Office supplies, Electronics, Documents (Optional)"
              />
            </div>
          </div>
        </div>
        
        {/* Section: Transportation Details */}
        <div className="border-b border-slate-200 pb-4 mb-4">
          <h3 className="text-md font-medium text-slate-700 mb-3 flex items-center">
            <Truck className="h-5 w-5 mr-2 text-blue-500" />
            Transportation Details
          </h3>
          <div className="mb-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">
                  Transportation Type
                </label>
                <div className="flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="transportationType"
                      value="courier"
                      checked={formData.transportationType === 'courier'}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span className="ml-2 text-slate-700">Courier</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="transportationType"
                      value="byHand"
                      checked={formData.transportationType === 'byHand'}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span className="ml-2 text-slate-700">By Hand / Vehicle</span>
                  </label>
                </div>
              </div>
              
              {formData.transportationType === 'courier' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="courierName" className="block mb-1 text-sm font-medium text-slate-700">
                      Courier Company Name
                    </label>
                    <input
                      type="text"
                      id="courierName"
                      name="courierName"
                      value={formData.courierName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., FedEx, DHL, Blue Dart"
                    />
                  </div>
                  <div>
                    <label htmlFor="courierTrackingNumber" className="block mb-1 text-sm font-medium text-slate-700">
                      Courier Tracking Number (Optional)
                    </label>
                    <input
                      type="text"
                      id="courierTrackingNumber"
                      name="courierTrackingNumber"
                      value={formData.courierTrackingNumber}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 123456789"
                    />
                  </div>
                </div>
              )}
              
              {formData.transportationType === 'byHand' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="vehicleDetails" className="block mb-1 text-sm font-medium text-slate-700">
                      Vehicle Details
                    </label>
                    <input
                      type="text"
                      id="vehicleDetails"
                      name="vehicleDetails"
                      value={formData.vehicleDetails}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Car - KA01AB1234, Company Van"
                    />
                  </div>
                  <div>
                    <label htmlFor="carrierName" className="block mb-1 text-sm font-medium text-slate-700">
                      Carrier Name
                    </label>
                    <input
                      type="text"
                      id="carrierName"
                      name="carrierName"
                      value={formData.carrierName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Name of person carrying the package"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Section: Returnable Package Information */}
        <div className="border-b border-slate-200 pb-4 mb-4">
          <div className="flex items-center mb-3">
            <input
              type="checkbox"
              id="isReturnable"
              name="isReturnable"
              checked={formData.isReturnable}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isReturnable" className="ml-2 block text-md font-semibold text-slate-700">
              <RotateCcw className="inline h-4 w-4 mr-1 text-blue-500" />
              This is a returnable package
            </label>
          </div>
          
          {formData.isReturnable && (
            <div className="pl-6 border-l-2 border-blue-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="returnDate" className="block mb-1 text-sm font-medium text-slate-700">
                    Return Date <span className="text-black">*</span>
                  </label>
                  <input
                    type="date"
                    id="returnDate"
                    name="returnDate"
                    value={formData.returnDate ? formData.returnDate.split('T')[0] : ''}
                    onChange={handleChange}
                    min={new Date().toISOString().split('T')[0]} // Set minimum date to today
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">Must be a future date</p>
                </div>
                
                <div>
                  <label htmlFor="returnReason" className="block mb-1 text-sm font-medium text-slate-700">
                    Return Reason
                  </label>
                  <input
                    type="text"
                    id="returnReason"
                    name="returnReason"
                    value={formData.returnReason}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Demo purposes, Testing, Borrowed item"
                  />
                </div>
              </div>
            </div>
          )}
        </div> {/* End of Returnable Package Information Section div */} 

        {/* Section: Package Images */}
        <div className="border-b border-slate-200 pb-4 mb-4">
          <h3 className="text-md font-semibold text-slate-700 mb-3 flex items-center">
            <ImageIcon className="h-4 w-4 mr-2 text-blue-500" />
            Package Images (Optional)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="imageBeforePacking" className="block mb-1 text-sm font-medium text-slate-700">
                Image Before Packing (JPG, JPEG, PNG)
              </label>
              <input
                type="file"
                id="imageBeforePacking"
                name="imageBeforePacking"
                accept="image/*"
                multiple
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {imageBeforePacking.length > 0 && <p className='text-xs text-slate-500 mt-1'>Selected: {imageBeforePacking.map(file => file.name).join(', ')}</p>}
            </div>
            <div>
              <label htmlFor="imageAfterPacking" className="block mb-1 text-sm font-medium text-slate-700">
                Image After Packing (JPG, JPEG, PNG)
              </label>
              <input
                type="file"
                id="imageAfterPacking"
                name="imageAfterPacking"
                accept="image/*"
                multiple
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {imageAfterPacking.length > 0 && <p className='text-xs text-slate-500 mt-1'>Selected: {imageAfterPacking.map(file => file.name).join(', ')}</p>}
            </div>
          </div>
        </div>
        
        {/* Item Section */}
        <div className="border-b border-slate-200 pb-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-slate-700">
              <Box className="inline h-5 w-5 mr-1 text-blue-500" />
              Items Details
            </h3>
            <button
              type="button"
              onClick={addNewItem}
              className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-800 rounded-full flex items-center text-sm font-medium border border-green-200"
            >
              <Plus className="h-4 w-4 mr-1" /> Add Item
            </button>
          </div>
          
          {items.map((item, index) => (
            <ItemFormSection
              key={index}
              item={item}
              index={index}
              onChange={handleItemChange}
              onRemove={() => removeItem(index)}
              showRemoveButton={items.length > 1}
            />
          ))}
        </div>
        
        {/* Common Weight & Additional Info Section */}
          <h3 className="text-lg font-semibold text-slate-700 mb-3">
            <Scale className="inline h-5 w-5 mr-1 text-blue-500" />
            Package & Weight Info
          </h3>
          <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="p-4 bg-white rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium text-slate-800">
                <Scale className="inline h-4 w-4 mr-2" />
                Common information for all items
              </h3>
              <button
                type="button"
                onClick={addWeightSection}
                className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-800 rounded-full flex items-center text-sm font-medium border border-green-200"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-black-500 uppercase tracking-wider">
                      Weight
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-black-500 uppercase tracking-wider w-24">
                      Unit
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-black-500 uppercase tracking-wider">
                      Dimension
                    </th>
                   
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <input
                        type="text"
                        id="weight"
                        name="weight"
                        value={commonInfo.weight || ''}
                        onChange={handleCommonInfoChange}
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="e.g., 5.5 (optional)"
                      />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <select
                        id="weightUnit"
                        name="weightUnit"
                        value={commonInfo.weightUnit || 'kg'}
                        onChange={handleCommonInfoChange}
                        className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                      >
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="lb">lb</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <input
                        type="text"
                        id="dimension"
                        name="dimension"
                        value={commonInfo.dimension || ''}
                        onChange={handleCommonInfoChange}
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="10x10x5 (lxbxh) (optional)"
                      />
                    </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
            {/* Additional Weight Sections */}
            {additionalSections.map((section, index) => (
              <div key={section.id} className="mt-6 pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-black-700">
                    Add Item {index + 1}
                  </h4>
                  <button
                    type="button"
                    onClick={() => removeWeightSection(section.id)}
                    className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 transition-colors"
                    title="Remove this section"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash2 h-4 w-4">
                      <path d="M3 6h18"></path>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                      <line x1="10" x2="10" y1="11" y2="17"></line>
                      <line x1="14" x2="14" y1="11" y2="17"></line>
                    </svg>
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-black-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-black-500 uppercase tracking-wider">
                          Weight*
                        </th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-black-500 uppercase tracking-wider w-24">
                          Unit*
                        </th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-black-500 uppercase tracking-wider">
                          Dimension*
                        </th>
                        
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <input
                            type="text"
                            value={section.weight}
                            onChange={(e) => handleAdditionalSectionChange(section.id, 'weight', e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="e.g., 5.5"
                            required
                          />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <select
                            value={section.weightUnit}
                            onChange={(e) => handleAdditionalSectionChange(section.id, 'weightUnit', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                            required
                          >
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                            <option value="lb">lb</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <input
                            type="text"
                            value={section.dimension}
                            onChange={(e) => handleAdditionalSectionChange(section.id, 'dimension', e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="10x10x5 (lxbxh)"
                            required
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  {/* <div className="mt-4">
                    <label className="flex items-center text-sm font-medium text-slate-700 mb-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline h-3 w-3 mr-1">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                      </svg>
                      Purpose*
                    </label>
                    <textarea
                      value={section.purpose}
                      onChange={(e) => handleAdditionalSectionChange(section.id, 'purpose', e.target.value)}
                      className="w-full h-24 px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter the purpose of this item..."
                      required
                    />
                  </div> */}
                </div>
              </div>
            ))}
            
            {/* Notes Section */}
            {/* <div>
                </div>
              </div>
            ))}
            
            {/* Notes Section */}
            {/* <div>
              <label htmlFor="notes" className="block mb-1 text-sm font-medium text-slate-700">
                Additional Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any other relevant information about this package"
              />
            </div> */}
            
            {/* Purpose Field */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <label htmlFor="remarks" className="flex items-center text-sm font-medium text-slate-700 mb-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline h-3 w-3 mr-1">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                Purpose*
              </label>
              <textarea
                id="purpose"
                name="purpose"
                value={commonInfo.purpose || ''}
                onChange={handleCommonInfoChange}
                className="w-full h-24 px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter the purpose of this package..."
                required
              />
            </div>
            
            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-4 py-2 rounded-md flex items-center ${
                  isSubmitting 
                    ? 'bg-blue-300 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white font-medium`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Package
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Confirmation Modal */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-sm">
                <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
                  <PackageIcon className="h-6 w-6 mr-2 text-blue-600" />
                  {packageToResubmit ? 'Resubmit Package' : 'Create New Package'}
                </h2>
                <div className="space-y-6">
                  <p className="text-slate-600 mb-6">
                    Please review all package details below before finalizing your submission.
                  </p>
                  <h3 className="text-lg font-semibold text-slate-700 mb-3">Package Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Remarks</p>
                      <p className="text-slate-800">{formData.remarks}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-slate-500">Recipient</p>
                      <p className="text-slate-800">{formData.recipient}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-slate-500">Project Code</p>
                      <p className="text-slate-800">{formData.projectCode || 'N/A'}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-slate-500">Manager</p>
                      <p className="text-slate-800">
                        {managers.find(m => m.id === formData.managerId)?.name || formData.managerId}
                      </p>
                    </div>
                    
                    {/* <div>
                      <p className="text-sm font-medium text-slate-500">Priority</p>
                      <p className="text-slate-800 capitalize">{formData.priority}</p>
                    </div> */}
                    
                    <div>
                      <p className="text-sm font-medium text-slate-500">Type</p>
                      <p className="text-slate-800">{formData.isReturnable ? 'Returnable' : 'Non-Returnable'}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-slate-500">Number of Packages</p>
                      <p className="text-slate-800">{formData.numberOfPackages}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-slate-500">Transport Type</p>
                      <p className="text-slate-800 capitalize">{formData.transportationType === 'byHand' ? 'By Hand' : 'Courier'}</p>
                    </div>
                    
                    {formData.transportationType === 'courier' && (
                      <>
                        <div>
                          <p className="text-sm font-medium text-slate-500">Courier Company</p>
                          <p className="text-slate-800">{formData.courierName}</p>
                        </div>
                        {formData.courierTrackingNumber && (
                          <div>
                            <p className="text-sm font-medium text-slate-500">Tracking Number</p>
                            <p className="text-slate-800">{formData.courierTrackingNumber}</p>
                          </div>
                        )}
                      </>
                    )}
                    
                    {formData.transportationType === 'byHand' && (
                      <>
                        <div>
                          <p className="text-sm font-medium text-slate-500">Vehicle Details</p>
                          <p className="text-slate-800">{formData.vehicleDetails}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-500">Carrier Name</p>
                          <p className="text-slate-800">{formData.carrierName}</p>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {formData.isReturnable && (
                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 mb-4">
                      <h4 className="text-md font-medium text-indigo-700 mb-2">Returnable Package</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {formData.returnDate && (
                          <div>
                            <p className="text-indigo-900">
                              {formData.returnDate}
                            </p>
                          </div>
                        )}
                        
                        {formData.returnReason && (
                          <div>
                            <p className="text-sm font-medium text-indigo-600">Return Reason</p>
                            <p className="text-indigo-900">{formData.returnReason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <h3 className="text-lg font-semibold text-slate-700 mb-3 mt-6">Package Items</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 mb-4">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Item #</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Serial Number</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">HSN Code</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Quantity</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Unit Price</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Taxable Value</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {items.map((item, index) => (
                          <tr key={index} className="hover:bg-slate-50">
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-900">{index + 1}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-900">{item.serialNumber}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-900">{item.hsnCode}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-900">{item.quantity}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-900">{item.unitPrice}</td>
                            <td className="px-4 py-2 text-sm text-slate-900">{item.taxableValue}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Common Weight Info in confirmation */}
                  <div className="bg-slate-50 p-3 rounded-md mb-4 border border-slate-200">
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Common Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs font-medium text-slate-500">Weight</p>
                        <p className="text-slate-800">{commonInfo.weight} {commonInfo.weightUnit}</p>
                      </div>
                      {commonInfo.purpose && (
                        <div>
                          <p className="text-xs font-medium text-slate-500">Purpose</p>
                          <p className="text-slate-800">{commonInfo.purpose}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {formData.notes && (
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-slate-700 mb-2">Additional Notes</h3>
                      <p className="text-slate-800 p-3 bg-slate-50 rounded-md border border-slate-200">{formData.notes}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end space-x-4 mt-8 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowConfirmation(false)}
                    className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    Go Back & Edit
                  </button>
                  
                  <button 
                    type="button"
                    onClick={finalizeSubmission}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors duration-150 flex items-center justify-center"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Confirm & Submit
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
      </div>
    </div>
  );
};

export default PackageFormNew;
