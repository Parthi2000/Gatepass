export interface PackageItem {
  id: string; // Item's own ID from the database
  package_id: string; // Foreign key to the package
  serialNumber: string;
  serial_number?: string; // Snake case for backend compatibility
  hsnCode: string;
  hsn_code?: string; // Snake case for backend compatibility
  description?: string;
  quantity: number;
  unitPrice: string;
  unit_price?: string; // Snake case for backend compatibility
  
  // Package dimension fields (stored at package level)
  dimensions?: {
    weight?: number;
    weight_unit?: 'kg' | 'g' | 'lb';
    dimension?: string; // Format: "LxWxH" (e.g., "10x20x30")
    purpose?: string;
  }[];
}

export interface PackageItemSubmission {
  serialNumber: string;
  hsnCode: string;
  quantity: number;
  unitPrice: string;
  description?: string;
  taxableValue?: string;
  // Note: weight, weight_unit, and dimension are now stored at package level
}

export interface PackageCommonInfo {
  weight: string;
  weightUnit: 'kg' | 'g' | 'lb';
  dimension?: string;
  purpose?: string;
}
