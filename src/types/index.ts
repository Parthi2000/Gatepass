export type UserRole = 'employee' | 'manager' | 'security' | 'admin' | 'logistics';

export interface User {
  id: string;
  name: string;
  fullName?: string;
  full_name?: string; // For backend compatibility
  email: string;
  role: UserRole;
  employeeId?: string;
  employee_id?: string; // For backend compatibility
}

export type PackageStatus = 'submitted' | 'approved' | 'rejected' | 'dispatched' | 'logistics_pending';

export interface Package {
  id: string;
  trackingNumber: string;
  tracking_number?: string; // Snake case version for database compatibility
  description: string;
  recipient: string;
  submittedBy: string;
  submitted_by?: string | number; // Snake case version for database compatibility
  submittedAt: Date;
  submitted_at?: string | Date; // Snake case version for database compatibility
  status: PackageStatus;
  assignedToManager?: string; // Manager ID this package is assigned to
  assigned_to_manager?: string | number; // Snake case version for database compatibility
  assignedManager?: {
    id: string;
    fullName: string;
    email: string;
  } | null; // Full manager object with details
  assignedManagerName?: string; // Manager name for display purposes (legacy, prefer assignedManager.fullName)
  approvedBy?: string;
  approved_by?: string | number; // Snake case version for database compatibility
  approvedAt?: Date;
  approved_at?: string | Date; // Snake case version for database compatibility
  rejectedBy?: string;
  rejected_by?: string | number; // Snake case version for database compatibility
  rejectedByName?: string; // Full name of the user who rejected the package
  rejected_by_name?: string; // Snake case version for database compatibility
  rejected_by_user?: User; // Full user object who rejected the package
  rejectedAt?: Date; // Timestamp when the package was rejected
  rejected_at?: string | Date; // Snake case version for database compatibility
  dispatchedBy?: string;
  dispatched_by?: string | number; // Snake case version for database compatibility
  dispatchedAt?: Date;
  dispatched_at?: string | Date; // Snake case version for database compatibility
  rejectionReason?: string;
  rejection_reason?: string; // Snake case version for database compatibility
  notes?: string;
  priority?: 'low' | 'medium' | 'high';
  
  // Project information
  projectCode?: string; // Project code for the package
  project_code?: string; // Snake case version for database compatibility
  
  // Returnable package information
  isReturnable?: boolean; // Indicates if this package needs to be returned
  is_returnable?: boolean; // Snake case version for database compatibility
  returnDate?: string; // Expected return date for returnable packages
  return_date?: string; // Snake case version for database compatibility
  returnReason?: string; // Reason why the package needs to be returned
  return_reason?: string; // Snake case version for database compatibility
  returnStatus?: 'pending' | 'returned' | 'overdue'; // Status of the return process
  return_status?: string; // Snake case version for database compatibility
  returnedBy?: string; // Name of the person returning the package
  returned_by?: string; // Snake case version for database compatibility
  returnNotes?: string; // Additional notes about the return
  return_notes?: string; // Snake case version for database compatibility
  returnedAt?: Date; // Timestamp when the package was returned
  // Note: removed duplicate 'returned_at' to fix TypeScript errors
  
  // Gate pass information
  gatePassSerialNumber?: string; // Auto-generated serial number for the gate pass
  gate_pass_serial_number?: string; // Snake case version for database compatibility
  date?: string; // Date of submission/creation
  toAddress?: string; // Complete address information
  to_address?: string; // Snake case version for database compatibility
   
  // Transportation details
  transportationType?: 'courier' | 'byHand'; // Method of transportation
  transportation_type?: string; // Snake case version for database compatibility
  vehicleDetails?: string; // Vehicle information for hand delivery
  vehicle_details?: string; // Snake case version for database compatibility
  courierName?: string; // Name of courier company if using courier
  courier_name?: string; // Snake case version for database compatibility
  courierTrackingNumber?: string; // Tracking number provided by courier company
  courier_tracking_number?: string; // Snake case version for database compatibility
  carrierName?: string; // Name of person carrying the package for byHand transport
  carrier_name?: string; // Snake case version for database compatibility
  
  // Item details
  serialNumber?: string; // Serial/part number of the item
  serial_number?: string; // Snake case version for database compatibility
  hsnCode?: string; // HSN code for the item
  hsn_code?: string; // Snake case version for database compatibility
  quantity?: number; // Quantity of items
  unitPrice?: string; // Price per unit
  unit_price?: string; // Snake case version for database compatibility
  remarks?: string; // Any additional remarks about the item
  
  // Package dimensions and weights
  dimension?: string | null; // Package dimensions (e.g., "10x10x5 cm")
  weight?: string | number | null; // Package weight (supports both string and number)
  weightUnit?: string; // Unit of weight (e.g., 'kg', 'g')
  weight_unit?: string; // Snake case version for database compatibility
  
  // Weight sections
  common_dimension?: {
    id?: string;
    weight: string | number | null;
    weight_unit: string;
    dimension?: string | null;
    purpose?: string | null;
    remarks?: string | null;
    is_common?: boolean;
    created_at?: string | Date;
    updated_at?: string | Date;
  } | null;
  
  additional_dimensions?: Array<{
    id?: string;
    weight: string | number | null;
    weight_unit: string;
    dimension?: string | null;
    purpose?: string | null;
    remarks?: string | null;
    is_common?: boolean;
    created_at?: string | Date;
    updated_at?: string | Date;
  }>;

  // Additional database fields
  created_at?: string | Date; // Creation timestamp from database
  updated_at?: string | Date; // Last update timestamp from database
  
  // Purchase Order information
  poNumber?: string; // Purchase Order number in camelCase
  po_number?: string; // Purchase Order number in snake_case
  poDate?: string | Date; // Purchase Order date in camelCase
  po_date?: string | Date; // Purchase Order date in snake_case
  
  // Package details
  purpose?: string; // Purpose of the package
  
  // Quantity information
  numberOfPackages?: number; // Total number of packages in camelCase
  number_of_packages?: number; // Total number of packages in snake_case
  
  // Resubmission information
  resubmitted?: boolean; // Whether this is a resubmission of a rejected package
  previousRejection?: string; // ID of the original rejected package in camelCase
  previous_rejection?: string | number; // ID of the original rejected package in snake_case
  
  // Image paths
  imageBeforePackingPath?: string;
  image_before_packing_path?: string; // Snake case for DB
  imageAfterPackingPath?: string;
  image_after_packing_path?: string; // Snake case for DB

  // Multi-item package support
  items?: import('./item').PackageItem[]; // Array of package items
  dimensions?: any[]; // Array of package dimensions
}

// Type for submitting a new package
export interface PackageSubmissionPayload extends Omit<Package, 'id' | 'trackingNumber' | 'submittedAt' | 'status' | 'submittedBy' | 'items' | 'tracking_number' | 'submitted_by' | 'submitted_at' | 'assigned_manager_name' | 'approved_by' | 'approved_at' | 'dispatched_by' | 'dispatched_at' | 'gate_pass_serial_number' | 'created_at' | 'updated_at' | 'previous_rejection' | 'assigned_to_manager' | 'serial_number' | 'hsn_code' | 'unit_price' | 'image_before_packing_path' | 'image_after_packing_path'> { // Omit fields not sent by client or handled differently, including new snake_case image paths
  items: import('./item').PackageItemSubmission[]; // For new packages, we send submission items
  assignedToManager?: string; // Explicitly include as it's part of submission form, Omit might remove it if not careful with optionality in base Package
  // Ensure all other necessary fields from the form are included here if Omit is too aggressive
  // For example, if 'Package' has 'weight?: string | number', Omit keeps it.
  // If a field is ONLY in snake_case in Package, it might be omitted. Add explicitly if needed for submission.
}