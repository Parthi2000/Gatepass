import React, { useState, useEffect } from 'react';
import { usePackages } from '../../context/PackageContext';
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
  packageToResubmit?: any;
  resetResubmission?: () => void;
}

const PackageFormSimplified: React.FC<PackageFormProps> = ({ onSubmit, packageToResubmit, resetResubmission }) => {
  const { submitPackage, managers } = usePackages();
  const [imageBeforePacking, setImageBeforePacking] = useState<File[]>([]);
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
    gatePassSerialNumber: '',
    date: new Date().toISOString().substr(0, 10),
    
    // Returnable information
    isReturnable: false,
    returnDate: '',
    returnReason: '',
    
    // Transportation details - SIMPLIFIED
    transportationType: 'courier',
    vehicleDetails: '',
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
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When packageToResubmit changes, update the form with the rejected package data
  useEffect(() => {
    if (packageToResubmit) {
      setImageBeforePacking([]);
      setFormData({
        remarks: packageToResubmit.remarks || '',
        recipient: packageToResubmit.recipient || '',
        projectCode: packageToResubmit.projectCode || '',
        poNumber: packageToResubmit.poNumber || '',
        poDate: packageToResubmit.poDate || '',
        notes: packageToResubmit.notes || '',
        priority: packageToResubmit.priority || 'medium',
        toAddress: packageToResubmit.toAddress || '',
        managerId: packageToResubmit.assignedToManager || packageToResubmit.assigned_to_manager || '',
        gatePassSerialNumber: packageToResubmit.gatePassSerialNumber || packageToResubmit.gate_pass_serial_number || '',
        date: packageToResubmit.date || new Date().toISOString().substr(0, 10),
        isReturnable: packageToResubmit.isReturnable || false,
        returnDate: packageToResubmit.returnDate || '',
        returnReason: packageToResubmit.returnReason || '',
        transportationType: packageToResubmit.transportationType || 'courier',
        vehicleDetails: packageToResubmit.vehicleDetails || '',
        carrierName: packageToResubmit.carrierName || '',
        numberOfPackages: packageToResubmit.numberOfPackages || 1,
      });
      
      if (packageToResubmit.items && packageToResubmit.items.length > 0) {
        setItems(packageToResubmit.items.map((item: any) => ({
          serialNumber: item.serialNumber || '',
          hsnCode: item.hsnCode || '',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || '',
          description: item.description || ''
        })));
      } else {
        setItems([{
          serialNumber: packageToResubmit.serialNumber || '',
          hsnCode: packageToResubmit.hsnCode || '',
          quantity: packageToResubmit.quantity || 1,
          unitPrice: packageToResubmit.unitPrice || '',
          description: packageToResubmit.description || ''
        }]);
      }
      
      if (resetResubmission) {
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
      }
      return;
    }
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prevData => ({
        ...prevData,
        [name]: checked
      }));
      return;
    }
    
    if (type === 'date') {
      setFormData(prevData => ({
        ...prevData,
        [name]: value
      }));
      return;
    }
    
    if (type === 'number') {
      const numberValue = value === '' ? '' : Number(value);
      setFormData(prevData => ({
        ...prevData,
        [name]: numberValue
      }));
      return;
    }
    
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };
  
  // Handle changes to individual items
  const handleItemChange = (index: number, updates: Partial<PackageItemSubmission>) => {
    const newItems = [...items];
    if ('unitPrice' in updates && updates.unitPrice === '') {
      updates.unitPrice = '0';
    }
    newItems[index] = { ...newItems[index], ...updates };
    setItems(newItems);
  };

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
    if (!formData.managerId) {
      newErrors.managerId = 'Please select a manager';
    }
    
    if (formData.poDate && new Date(formData.poDate) > new Date()) {
      newErrors.poDate = 'PO Date cannot be in the future';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    try {
      if (formData.isReturnable && formData.returnDate) {
        const returnDate = new Date(formData.returnDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (returnDate < today) {
          throw new Error('Return date must be in the future');
        }
      }
      
      // Validate items
      if (items.length === 0) {
        throw new Error('Please add at least one item to the package');
      }
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.serialNumber) {
          throw new Error(`Please enter a serial number for item ${i + 1}`);
        }
        if (!item.quantity || item.quantity <= 0) {
          throw new Error(`Please enter a valid quantity for item ${i + 1}`);
        }
      }
      
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
      const payload = new FormData();

      // Generate tracking number
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
      payload.append('is_returnable', String(formData.isReturnable));
      if (formData.returnDate) payload.append('return_date', formData.returnDate);
      if (formData.returnReason) payload.append('return_reason', formData.returnReason);
      
      // Transportation details - NO COURIER FIELDS
      payload.append('transportation_type', formData.transportationType);
      if (formData.vehicleDetails) payload.append('vehicle_details', formData.vehicleDetails);
      if (formData.carrierName) payload.append('carrier_name', formData.carrierName);
      payload.append('number_of_packages', String(formData.numberOfPackages));
      if (formData.poNumber) payload.append('po_number', formData.poNumber);
      if (formData.poDate) payload.append('po_date', formData.poDate);

      // Prepare items
      const preparedItems = items.map(item => ({
        serial_number: item.serialNumber,
        hsn_code: item.hsnCode,
        unit_price: item.unitPrice ? parseFloat(item.unitPrice) : null,
        quantity: item.quantity ? parseInt(item.quantity.toString(), 10) : 1,
        description: item.description || '',
        value: item.unitPrice && item.quantity ? 
          (parseFloat(item.unitPrice) * parseInt(item.quantity.toString(), 10)) : 0
      }));
      
      payload.append('items', JSON.stringify(preparedItems));

      // Append files - only image before packing
      imageBeforePacking.forEach(file => payload.append('image_before_packing', file));

      // Append resubmission fields if applicable
      if (packageToResubmit) {
        payload.append('resubmitted', 'true');
        payload.append('previousRejection', String(packageToResubmit.id));
      } else {
        payload.append('resubmitted', 'false');
      }
      
      // Submit package with FormData
      const submittedPackage = await submitPackage(payload);
      
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
      
      // Reset images
      setImageBeforePacking([]);
      
      // Clear file input fields
      const fileInputBefore = document.getElementById('imageBeforePacking') as HTMLInputElement;
      if (fileInputBefore) fileInputBefore.value = '';
      
      if (packageToResubmit && resetResubmission) {
        resetResubmission();
      }
      
      if (onSubmit) {
        onSubmit(submittedPackage);
      }
      
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
        <div className="mb-4 p-3 bg-green-100 border border-green-200 text-green-700 rounded-md">
          <div className="flex items-start">
            <Check className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Package submitted successfully!</p>
              {formData.transportationType === 'courier' ? (
                <p>Your package has been sent to the logistics team for courier processing. You'll be notified once it's ready for manager approval.</p>
              ) : (
                <p>Your package has been assigned to the selected manager for approval.</p>
              )}
            </div>
          </div>
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
                max={new Date().toISOString().split('T')[0]}
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
        
        {/* Section: Transportation Details - SIMPLIFIED */}
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
              
              {/* COURIER INFORMATION NOTE - NO INPUT FIELDS */}
              {formData.transportationType === 'courier' && (
                <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        Courier Information
                      </h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>Courier company details and tracking information will be filled by the <strong>Logistics team</strong> before manager approval.</p>
                      </div>
                    </div>
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
                    min={new Date().toISOString().split('T')[0]}
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
        </div>

        {/* Section: Package Images - Only Before Packing */}
        <div className="border-b border-slate-200 pb-4 mb-4">
          <h3 className="text-md font-semibold text-slate-700 mb-3 flex items-center">
            <ImageIcon className="h-4 w-4 mr-2 text-blue-500" />
            Package Images (Optional)
          </h3>
          <div className="grid grid-cols-1 gap-4">
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
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-md">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-orange-800">
                    Image After Packing
                  </h3>
                  <div className="mt-2 text-sm text-orange-700">
                    <p>The <strong>Image After Packing</strong> will be uploaded by the <strong>Logistics team</strong> during package processing.</p>
                  </div>
                </div>
              </div>
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
        
        {/* PACKAGE WEIGHT INFO NOTE - NO INPUT FIELDS */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
          <h3 className="text-lg font-semibold text-orange-800 mb-3 flex items-center">
            <Scale className="inline h-5 w-5 mr-2 text-orange-600" />
            Package & Weight Information
          </h3>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <div className="text-sm text-orange-700">
                <p><strong>Package weight and dimension information will be filled by the Logistics team</strong> before manager approval.</p>
                <p className="mt-2">This includes:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Package weight and unit</li>
                  <li>Package dimensions</li>
                  <li>Courier company details (if courier is selected)</li>
                  <li>Courier tracking number</li>
                </ul>
              </div>
            </div>
          </div>
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
        
        {/* Confirmation Modal */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Confirm Package Submission</h2>
                <p className="text-slate-600 mb-4">Please review your package details before submitting.</p>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <span className="font-medium">Recipient:</span> {formData.recipient}
                  </div>
                  <div>
                    <span className="font-medium">Transportation:</span> {formData.transportationType === 'courier' ? 'Courier' : 'By Hand'}
                  </div>
                  <div>
                    <span className="font-medium">Items:</span> {items.length} item(s)
                  </div>
                  {formData.transportationType === 'courier' && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-700">
                        <strong>Note:</strong> Courier details will be filled by the Logistics team before manager approval.
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowConfirmation(false)}
                    className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
                  >
                    Go Back
                  </button>
                  <button 
                    type="button"
                    onClick={finalizeSubmission}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded flex items-center"
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

export default PackageFormSimplified;