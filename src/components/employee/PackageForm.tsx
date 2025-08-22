import React, { useState, useEffect } from 'react';
import { Package } from '../../types';
import { usePackages } from '../../context/PackageContext';

interface PackageFormProps {
  onSubmit?: (packageData: any) => void;
  packageToResubmit?: Package;
  resetResubmission?: () => void;
}

interface FormDataState {
  trackingNumber: string;
  gatePassSerialNumber: string;
  to_address: string;
  recipient: string;
  description: string;
  serialNumber: string; // Consider moving to an items array for multi-item packages
  hsnCode: string;      // Consider moving to an items array
  notes: string;
  managerId: string;
  imageBeforePacking?: File | null;
  imageAfterPacking?: File | null;
}

// Manager type is already included in the usePackages context

const PackageForm: React.FC<PackageFormProps> = ({ onSubmit, packageToResubmit, resetResubmission }) => {
  const { submitPackage, managers } = usePackages();
  const [formData, setFormData] = useState<FormDataState>({
    trackingNumber: '',
    gatePassSerialNumber: '',
    to_address: '',
    recipient: '',
    description: '',
    serialNumber: '',
    hsnCode: '',
    notes: '',
    managerId: '', // Changed from number to string to match form input
    imageBeforePacking: null,
    imageAfterPacking: null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingPackageWarning, setExistingPackageWarning] = useState<string | null>(null);

  // Managers are fetched from the context

  // Populate form if resubmitting a package
  useEffect(() => {
    if (packageToResubmit) {
      setFormData({
        trackingNumber: packageToResubmit.trackingNumber || '',
        gatePassSerialNumber: packageToResubmit.gatePassSerialNumber || '',
        to_address: packageToResubmit.to_address || '',
        recipient: packageToResubmit.recipient || '',
        description: packageToResubmit.description || '',
        serialNumber: packageToResubmit.serialNumber || '',
        hsnCode: packageToResubmit.hsnCode || '',
        notes: packageToResubmit.notes || '',
        managerId: String(packageToResubmit.assignedToManager || ''), // Use assignedToManager from Package type
        imageBeforePacking: null, // Reset images on resubmission
        imageAfterPacking: null   // Reset images on resubmission
      } as FormDataState); // Added type assertion
    }
  }, [packageToResubmit]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, type } = e.target;
    
    if (type === 'file') {
      const file = (e.target as HTMLInputElement).files?.[0];
      setFormData(prev => ({
        ...prev,
        [name]: file || null
      }));
    } else {
      const { value } = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear warnings when user starts typing (common logic for all input types)
    if (existingPackageWarning) {
      setExistingPackageWarning(null);
    }
  };

  const checkForExistingPackage = async () => {
    // Mock function - replace with actual API call
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock logic - return false for now
      return false;
    } catch (error) {
      console.error('Error checking for existing package:', error);
      return false;
    }
  };

  const validateForm = (): boolean => {
    if (!formData.trackingNumber.trim()) {
      setError('Tracking number is required');
      return false;
    }
    
    if (!formData.gatePassSerialNumber.trim()) {
      setError('Gate pass serial number is required');
      return false;
    }
    
    if (!formData.to_address.trim()) {
      setError('To address is required');
      return false;
    }
    
    if (!formData.recipient.trim()) {
      setError('Recipient is required');
      return false;
    }
    
    if (!formData.managerId) {
      setError('Please select a manager');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExistingPackageWarning(null);
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const existingPackage = await checkForExistingPackage();
      if (existingPackage) {
        setExistingPackageWarning(
          `A package with tracking number ${formData.trackingNumber} already exists. Please verify the details.`
        );
        setIsSubmitting(false);
        return;
      }

      const data = new FormData();
      // Append all simple form fields
      Object.keys(formData).forEach(key => {
        // Skip file fields, they will be appended separately if they exist
        if (key === 'imageBeforePacking' || key === 'imageAfterPacking') return;
        // @ts-ignore
        data.append(key, formData[key]);
      });

      // Append managerId as assignedToManager
      data.append('assignedToManager', formData.managerId);
      data.append('resubmitted', String(!!packageToResubmit));

      // Append files if they exist
      if (formData.imageBeforePacking instanceof File) {
        data.append('imageBeforePacking', formData.imageBeforePacking);
      }
      if (formData.imageAfterPacking instanceof File) {
        data.append('imageAfterPacking', formData.imageAfterPacking);
      }
      
      // Remove redundant fields that are now part of FormData or handled differently
      // @ts-ignore
      delete data.managerId; 
      // @ts-ignore
      delete data.imageBeforePacking; 
      // @ts-ignore
      delete data.imageAfterPacking;

      // Submit the package using the context function
      const submittedPackage = await submitPackage(data);
      
      // Call the onSubmit callback if provided
      if (onSubmit) {
        onSubmit(submittedPackage);
      }
      
      setShowSuccess(true);
      
      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
          trackingNumber: '',
          gatePassSerialNumber: '',
          to_address: '',
          recipient: '',
          description: '',
          serialNumber: '',
          hsnCode: '',
          notes: '',
          managerId: ''
        });
        setShowSuccess(false);
        if (resetResubmission) {
          resetResubmission();
        }
      }, 2000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit package. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {packageToResubmit ? 'Resubmit Package' : 'Submit New Package'}
        </h2>
        <p className="text-gray-600">
          {packageToResubmit 
            ? 'Update the package details and resubmit for approval' 
            : 'Fill in the package details to submit for approval'
          }
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      )}

      {existingPackageWarning && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-700 font-medium">{existingPackageWarning}</p>
        </div>
      )}

      {showSuccess && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 font-medium">
            Package {packageToResubmit ? 'resubmitted' : 'submitted'} successfully!
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="trackingNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Tracking Number *
            </label>
            <input
              type="text"
              id="trackingNumber"
              name="trackingNumber"
              value={formData.trackingNumber}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter tracking number"
              required
            />
          </div>

          <div>
            <label htmlFor="gatePassSerialNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Gate Pass Serial Number *
            </label>
            <input
              type="text"
              id="gatePassSerialNumber"
              name="gatePassSerialNumber"
              value={formData.gatePassSerialNumber}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter gate pass serial number"
              required
            />
          </div>

          <div>
            <label htmlFor="to_address" className="block text-sm font-medium text-gray-700 mb-2">
              To Address *
            </label>
            <input
              type="text"
              id="to_address"
              name="to_address"
              value={formData.to_address}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter to address"
              required
            />
          </div>

          <div>
            <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 mb-2">
              Recipient *
            </label>
            <input
              type="text"
              id="recipient"
              name="recipient"
              value={formData.recipient}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter recipient name"
              required
            />
          </div>

          <div>
            <label htmlFor="serialNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Serial Number
            </label>
            <input
              type="text"
              id="serialNumber"
              name="serialNumber"
              value={formData.serialNumber}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter serial number"
            />
          </div>

          <div>
            <label htmlFor="hsnCode" className="block text-sm font-medium text-gray-700 mb-2">
              HSN Code
            </label>
            <input
              type="text"
              id="hsnCode"
              name="hsnCode"
              value={formData.hsnCode}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter HSN code"
            />
          </div>
        </div>

        <div>
          <label htmlFor="managerId" className="block text-sm font-medium text-gray-700 mb-2">
            Assign to Manager *
          </label>
          <select
            id="managerId"
            name="managerId"
            value={formData.managerId}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Select a manager</option>
            {managers.map(manager => (
              <option key={manager.id} value={manager.id}>
                {manager.name} ({manager.email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Remarks
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe the package contents"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
            Additional Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Any additional notes or special instructions"
          />
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`flex-1 py-3 px-6 rounded-md font-medium transition-colors ${
              isSubmitting
                ? 'bg-gray-400 cursor-not-allowed text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isSubmitting 
              ? (packageToResubmit ? 'Resubmitting...' : 'Submitting...') 
              : (packageToResubmit ? 'Resubmit Package' : 'Submit Package')
            }
          </button>
          
          {packageToResubmit && resetResubmission && (
            <button
              type="button"
              onClick={resetResubmission}
              className="px-6 py-3 border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default PackageForm;