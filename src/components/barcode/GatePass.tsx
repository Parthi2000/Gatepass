import React, { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Package, 
  MapPin, 
  User, 
  Printer, 
  Building, 
  Scale,
  CheckCircle,
  Truck,

} from 'lucide-react';
import BarcodeGenerator from './BarcodeGenerator';
import { format } from 'date-fns';
import { 
  Typography, Box, Button, Divider, Paper,
  CircularProgress
} from '@mui/material';
// import Grid from '@mui/material/Grid'; // Not used
import { styled } from '@mui/material/styles';

interface Item {
  serialNumber?: string;
  serial_number?: string;
  hsnCode?: string;
  hsn_code?: string;
  description?: string;
  quantity?: number;
  unitPrice?: string;
  unit_price?: string;
  purpose?: string;
}

interface GatePassProps {
  packageData: {
    id: string;
    trackingNumber: string;
    tracking_number?: string;
    description: string;
    recipient: string;
    to_address?: string;
    projectCode?: string;
    project_code?: string;
    poNumber?: string;
    po_number?: string;
    poDate?: string | Date;
    po_date?: string | Date;
    submittedBy?: string;
    submitted_by?: string | number;
    submittedByName?: string;
    submitted_by_name?: string;
    priority?: 'low' | 'medium' | 'high';
    
    // Weight and dimension information
    common_dimension?: {
      weight: string;
      weight_unit?: string;
      dimension: string;
      purpose?: string;
      remarks?: string;
      created_at?: string;
      updated_at?: string;
    };
    
    additional_dimensions?: Array<{
      id?: string | number;
      weight: string;
      weight_unit?: string;
      dimension: string;
      purpose?: string;
      remarks?: string;
      created_at?: string;
      updated_at?: string;
    }>;
    
    // Gate pass information
    gatePassSerialNumber?: string;
    gate_pass_serial_number?: string;
    date?: string;
    created_at?: string;
    toAddress?: string;
    
    // Manager information
    assignedToManagerName?: string;
    // Manager name is derived from the assignedToManager relationship
    assigned_to_manager_name?: string;
    managerName?: string;
    assignedToManager?: string | number;
    assigned_to_manager?: string | number;
    assigned_manager?: { full_name: string };
    
    // Returnable package information
    isReturnable?: boolean;
    is_returnable?: boolean;
    returnDate?: string;
    return_date?: string;
    returnReason?: string;
    return_reason?: string;
    
    // Transportation details
    transportationType?: 'courier' | 'byHand';
    transportation_type?: string;
    vehicleDetails?: string;
    vehicle_details?: string;
    courierName?: string;
    courier_name?: string;
    courierTrackingNumber?: string;
    courier_tracking_number?: string;
    carrierName?: string;
    carrier_name?: string;
    
    // Item details
    serialNumber?: string;
    serial_number?: string;
    hsnCode?: string;
    hsn_code?: string;
    quantity?: number;
    unitPrice?: string;
    unit_price?: string;
    remarks?: string;
    purpose?: string;
    numberOfPackages?: number;
    number_of_packages?: number;
    weight?: string;
    weight_unit?: string;
    dimension?: string;
    package_weight?: string;
    package_weight_unit?: string;
    package_dimension?: string;
    
    // Items array for multiple items
    items?: Item[];
    dimensions?: any[]; // Array of package dimensions
  };
}

// Styled components
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(2),
  border: `2px solid ${theme.palette.grey[300]}`,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1]
}));

const FieldBox = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  '& .label': {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(0.5),
    display: 'flex',
    alignItems: 'center',
    '& svg': {
      marginRight: theme.spacing(0.5),
      color: theme.palette.primary.main
    }
  },
  '& .value': {
    fontSize: '1rem',
    fontWeight: 500
  }
}));

const GatePass: React.FC<GatePassProps> = ({ packageData }) => {
  const { user } = useAuth();
  const gatePassRef = useRef<HTMLDivElement>(null);
  const [currentPackageData] = useState(packageData);
  const [isPrinting, setIsPrinting] = useState(false);

  // Debug logging to check received data
  console.log('GatePass received packageData:', packageData);
  console.log('GatePass dimensions:', packageData.dimensions);
  console.log('GatePass purpose from dimensions:', packageData.dimensions?.[0]?.purpose);
  console.log('GatePass direct purpose:', packageData.purpose);

  // Helper function to get item property value
  const getItemValue = (item: Item, camelCase: string, snakeCase: string) => {
    const value = item[camelCase as keyof Item] || item[snakeCase as keyof Item];
    return value !== undefined && value !== null ? value : 'N/A';
  };

  const getPackagePurpose = (pkg: typeof packageData): string => {
    // Check all possible locations for the purpose field
    const possiblePurposes = [
      pkg.purpose,
      pkg.common_dimension?.purpose,
      pkg.dimensions?.[0]?.purpose,
      pkg.items?.[0]?.purpose
    ];
    
    // Find the first non-empty, non-undefined purpose
    const foundPurpose = possiblePurposes.find(p => p && typeof p === 'string' && p.trim() !== '');
    
    // Log the purpose extraction for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('Purpose extraction debug:', {
        directPurpose: pkg.purpose,
        commonDimensionPurpose: pkg.common_dimension?.purpose,
        firstDimensionPurpose: pkg.dimensions?.[0]?.purpose,
        firstItemPurpose: pkg.items?.[0]?.purpose,
        foundPurpose
      });
    }
    
    return foundPurpose || 'N/A';
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    
    try {
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Failed to open print window');
      }
      
      // Get the purpose using our helper function
      const purpose = getPackagePurpose(packageData);
      
      // Create a clean package data object with the extracted purpose
      const currentPackageData = { 
        ...packageData,
        purpose
      };
      
      // Create a data URL for the logo
      const loadLogo = () => {
        return new Promise<string>((resolve) => {
          const logoUrl = `${window.location.origin}/images/logos.png`;
          const img = new Image();
          
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/png'));
            } else {
              resolve(logoUrl);
            }
          };
          
          img.onerror = () => {
            console.warn('Failed to load logo, using fallback');
            resolve(logoUrl);
          };
          
          img.src = logoUrl;
        });
      };
      
      // Load the logo and get its data URL
      const logoDataUrl = await loadLogo();
      
      // Set the print window content with the logo as a data URL
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Gate Pass - ${currentPackageData.trackingNumber || currentPackageData.tracking_number || 'N/A'}</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
              
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              }
              
              @page {
                size: A4;
                margin: 0;
              }
              
              body { 
                margin: 0; 
                padding: 20px; 
                background-color: #f8fafc;
                color: rgb(0, 0, 0);
                width: 210mm;
                min-height: 297mm;
              }
              
              .gate-pass { 
                border: 2px solidrgb(5, 5, 5); 
                border-radius: 8px;
                padding: 20px; 
                width: 100%;
                margin: 0 auto; 
                background-color: white;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
                box-sizing: border-box;
              }
              
              .gate-pass-header { 
                display: flex; 
                justify-content: space-between; 
                align-items: center; 
                border-bottom: 1px solid #e2e8f0; 
                padding-bottom: 8px; 
                margin-bottom: 12px; 
              }
              
              .company-logo-section {
                display: flex;
                align-items: center;
                gap: 12px;
              }
              
              .company-logo {
                width: 60px;
                height: 60px;
                display: flex;
                align-items: center;
                justify-content: center;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              
              .company-logo {
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 24px;
              }
              
              .company-info {
                display: flex;
                flex-direction: column;
              }
              
              .company-name { 
                font-size: 28px; 
                font-weight: 700; 
                color: #0f172a;
                letter-spacing: -0.5px;
              }
              
              .company-tagline {
                font-size: 14px;
                color:rgb(0, 0, 0);
                font-weight: 500;
              }
              
              .tracking-section {
                text-align: right;
              }
              
              .tracking-label {
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 1px;
                color:rgb(0, 0, 0);
                margin-bottom: 4px;
                font-weight: 600;
              }
              
              .tracking-number { 
                font-size: 20px; 
                font-weight: bold; 
                color: #0f172a;
                letter-spacing: 1px;
              }
              
              .gate-pass-body {
                display: grid;
                grid-template-columns: 1.7fr 1fr;
                gap: 4px;
                margin: 0;
                padding: 0;
                width: 100%;
              }
              
           .gate-pass-details {
                background-color: #f8fafc;
                padding: 6px 8px 0 8px; /* No bottom padding */
                border-radius: 4px;
                border: 1px solid #e2e8f0;
                display: flex;
                flex-direction: column;
                gap: 0; /* No gap between rows */
                overflow: hidden; /* Prevents any extra spacing */
              }
              
              /* Remove bottom border and spacing from the last .detail-row */
              .gate-pass-details .detail-row:last-child {
                border-bottom: none !important;
                margin-bottom: 0 !important;
                padding-bottom: 0 !important;
              }
              
              /* Ensure no extra space after the last row */
              .gate-pass-details:after {
                display: none !important;
              }
              
              /* Optional: Adjust spacing between rows if needed */
              .gate-pass-details .detail-row {
                margin: 0;
                padding: 6px 0;
                border-bottom: 1px dashed #e2e8f0;
              }
              /* Remove border and space after last detail-row */
              .gate-pass-details .detail-row:last-child {
                border-bottom: none;
                margin-bottom: 0 !important;
                padding-bottom: 0 !important;
              }
              
              .gate-pass-barcode { 
                background-color: #f8fafc;
                padding: 12px 16px;
                border-radius: 6px;
                border: 1px solid #e2e8f0;
                height: auto;
                min-height: 200px; /* Match the height of package information */
                display: flex;
                flex-direction: column;
                justify-content: space-between;
              }
              
              .detail-row { 
                margin: 0; 
                display: flex;
                border-bottom: 1px dashed #e2e8f0;
                padding: 2px 0;
                min-height: 24px;
                align-items: center;
              }
              
              .detail-row:last-child {
                border-bottom: none;
                margin-bottom: 0;
              }
              
              .detail-label { 
                font-weight: 600; 
                width: 120px; 
                color:rgb(0, 0, 0);
                font-size: 11px;
                display: flex;
                align-items: center;
                white-space: nowrap;
                flex-shrink: 0;
              }
              
              .detail-label svg {
                margin-right: 8px;
                color: #3b82f6;
              }
              
              .detail-value { 
                flex: 1; 
                font-weight: 500;
                color: #1e293b;
                font-size: 11px;
                margin-left: 2px;
                line-height: 1.2;
                word-break: break-word;
              }
              
              .section-title {
                font-size: 14px;
                font-weight: 600;
                color:rgb(0, 0, 0);
                margin: 2px 0 6px 0;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 4px;
              }
              
              .items-section {
                margin-top: 12px;
              }
              
              .purpose-section {
                margin: 12px 0;
              }
              
              .purpose-content {
                background-color: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                padding: 12px;
                margin-top: 4px;
                min-height: 60px;
              }
              
              .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 4px 0 0 0;
                text-align: center;
                table-layout: fixed;
              }
              
              .items-table th,
              .items-table td {
                border: 1px solid #e2e8f0;
                padding: 4px 6px;
                text-align: center;
                font-size: 11px;
                line-height: 1.2;
              }
              
              .items-table th {
                background-color: #f1f5f9;
                font-weight: 600;
                color: #0f172a;
                text-transform: uppercase;
                font-size: 10px;
                letter-spacing: 0.5px;
                padding: 4px 6px;
              }
              
              .items-table td {
                padding: 4px 6px;
                border: 1px solid #e2e8f0;
                color:rgb(0, 0, 0);
                font-size: 11px;
                word-wrap: break-word;
              }
              
              .items-table tr:nth-child(even) {
                background-color: #f8fafc;
              }
              
              .no-items {
                text-align: center;
                padding: 16px;
                color:rgb(8, 8, 8);
                font-style: italic;
                border: 1px solid #e2e8f0;
                background-color: #f8fafc;
              }
              
              .footer-container {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: white;
                border-top: 2px solid #e2e8f0;
                padding: 10px 0 0 0 !important;
                margin: 0 !important;
                page-break-inside: avoid;
              }
              
              @media print {
                .footer-container {
                  border-top: none !important;
                }
                .company-tagline {
                  font-size: 0.8em !important;
                }
                .section-title {
                  border-bottom: none !important;
                  margin-bottom: 4px !important;
                  padding-bottom: 0 !important;
                }
              }
              
              .signatures { 
                display: flex; 
                justify-content: space-between; 
                padding: 0 20px;
                margin: 0 0 10px 0 !important;
              }
              
              .security-notice {
                text-align: center;
                font-size: 11px;
                font-weight: 500;
                color: #000000;
                background-color: #ffffff;
                padding: 8px 20px;
                border-top: 1px solid #000000;
                margin: 0;
                width: 100%;
                box-sizing: border-box;
              }
              
              @page {
                margin: 0 !important;
                padding: 0 !important;
              }
              
              @media print {
                @page {
                  margin: 0.5cm;
                }
                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color: #000000 !important;
                  background-color: #ffffff !important;
                }
                .footer-container {
                  position: fixed;
                  bottom: 0;
                  left: 0;
                  right: 0;
                  background: white !important;
                }
                .security-notice {
                  color: #000000 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  border-top: 1px solid #000000 !important;
                  font-weight: 500 !important;
                  background: white !important;
                }
                body, .print-container, .print-container * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color: #000000 !important;
                  background-color: #ffffff !important;
                }
                /* Ensure all text is black and backgrounds are white */
                div, span, p, h1, h2, h3, h4, h5, h6, a, td, th, tr, table, tbody, thead, tfoot {
                  color: #000000 !important;
                  background-color: #ffffff !important;
                  border-color: #000000 !important;
                }
                /* Remove any box shadows in print */
                * {
                  box-shadow: none !important;
                  text-shadow: none !important;
                }
              }
              
              .signature-box { 
                width: 30%; 
                text-align: center; 
              }
              
              .signature-line { 
                border-top: 1px solid #94a3b8; 
                margin-top: 80px; 
              }
              
              .signature-title {
                font-size: 14px;
                font-weight: 600;
                color:rgb(0, 0, 0);
                margin-top: 8px;
              }
              
              .returnable-tag { 
                background-color: #eff6ff; 
                border: 1px solid #bfdbfe; 
                border-radius: 4px; 
                padding: 4px 8px; 
                color: #2563eb; 
                font-weight: 600; 
                display: inline-block; 
                margin-left: 10px; 
                font-size: 12px; 
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              
              .barcode-scan-text {
                font-size: 14px;
                color:rgb(0, 0, 0);
                margin-bottom: 16px;
                text-align: center;
                font-weight: 500;
              }
              
              .priority-badge {
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              
              .priority-high {
                background-color: #fee2e2;
                color: #ef4444;
                border: 1px solid #fecaca;
              }
              
              .priority-medium {
                background-color: #e0f2fe;
                color: #0284c7;
                border: 1px solid #bae6fd;
              }
              
              .priority-low {
                background-color: #dcfce7;
                color: #16a34a;
                border: 1px solid #bbf7d0;
              }
              
              .barcode-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                background: transparent !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
              }
              
              .barcode-number {
                font-family: monospace;
                font-size: 12px;
                color: #1e293b;
                margin: 0;
                padding: 0;
              }
              
              .barcode-container svg {
                width: 500px; /* Increased width */
                height: 40px;
                background: transparent !important;
              }
              
              .date-section {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin: 0 0 5px 0;
                padding: 10px 15px 0 15px; /* Removed bottom padding */
                background-color: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
              }
              
              .date-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                margin: 0 4px;
              }
              
              .date-label, .date-section .date-label {
                font-size: 11px;
                color: rgb(10, 10, 10);
                font-weight: 700 !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
                margin-bottom: 2px;
              }
              
              .date-value {
                font-size: 16px;
                font-weight: 600;
                color: #0f172a;
              }
              
              .security-notice {
                margin-top: 16px;
                font-size: 12px;
                color:rgb(6, 6, 7);
                text-align: center;
                font-style: italic;
              }
              
              @media print {
                .no-print { display: none; }
                body { 
                  background-color: white;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .gate-pass { 
                  box-shadow: none;
                  border: 2px solidrgb(12, 12, 14);
                }
                .items-table th {
                  background-color: #f1f5f9 !important;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                /* Remove top border and padding from weight row when printing */
                .detail-row[style*="border-top"] {
                  border-top: none !important;
                  padding-top: 0 !important;
                  margin-top: 0 !important;
                }
                .items-table tr:nth-child(even) {
                  background-color: #f8fafc !important;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                
                /* Make header repeat on every printed page */
                @page {
                  margin: 0; /* Remove all margins for the printed page */
                }
                
                .gate-pass-header {
                  position: relative;
                  background: white;
                  z-index: 1000;
                  padding: 10px 20px; /* Reduced padding for more compact header */
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                  display: flex;
                  justify-content: space-between;
                  align-items: center; /* Center items vertically */
                  min-height: 70px;
                  width: 100%;
                  box-sizing: border-box;
                  border-bottom: 1px solid #e2e8f0; /* Keep only bottom border */
                }
                
                @media print {
                  .gate-pass-header {
                    padding: 10px 20px 10px 10px; /* Reduced right padding */
                  }
                  .company-logo-section {
                    margin-left: -15px; /* Move logo section more to the left */
                    width: 60%; /* Reduce width to give more space to tracking section */
                  }
                  .tracking-section {
                    margin-right: -20px; /* Move tracking section more to the right */
                    width: 40%; /* Increase width of tracking section */
                    padding-left: 0; /* Remove left padding */
                  }
                }
                
                .company-logo-section {
                  display: flex;
                  align-items: center;
                  gap: 12px;
                  width: 65%; /* Reduced from 70% to give more space to tracking section */
                }
                
                .company-logo {
                  width: 50px !important;
                  height: 50px !important;
                  padding: 2px !important;
                  flex-shrink: 0; /* Prevent logo from shrinking */
                }
                
                .company-info {
                  line-height: 1.2;
                }
                
                .company-name {
                  font-size: 22px !important; /* Increased from 18px */
                  font-weight: bold;
                  margin-bottom: 4px; /* Added spacing between name and tagline */
                }
                
                .company-tagline {
                  font-size: 12px !important; /* Increased from 10px */
                  line-height: 1.3; /* Improved line height for better readability */
                }
                
                .tracking-section {
                  text-align: right;
                  font-size: 12px !important;
                  width: 35%; /* Increased from 30% to take more space */
                  padding-left: 10px; /* Reduced padding */
                  margin-left: 10px; /* Reduced margin */
                }
                
                .tracking-number {
                  font-size: 14px !important;
                  font-weight: 600 !important; /* Make the number bold */
                  margin-top: 4px; /* Add small space between label and number */
                }
                
                .tracking-label {
                  font-weight: 500; /* Slightly bolder label */
                }
                
                .gate-pass {
                  padding-top: 0; /* Remove top padding */
                  margin: 0; /* Remove any margins */
                }
              }
            </style>
          </head>
          <body>
            <div class="gate-pass">
              <div class="gate-pass-header">
                <div class="company-logo-section">
                  <div class="company-logo" style="width: 60px; height: 60px; background-color: white; padding: 4px; border: 1px solid #e2e8f0; border-radius: 4px;">
                    <div style="
                      width: 100%;
                      height: 100%;
                      background-image: url('${logoDataUrl}');
                      background-size: contain;
                      background-repeat: no-repeat;
                      background-position: center;
                      -webkit-print-color-adjust: exact !important;
                      print-color-adjust: exact !important;
                    "></div>
                  </div>
                  <div class="company-info">
                    <div class="company-name">Rangsons Aerospace Pvt Ltd</div>
                    <div class="company-tagline" style="@media print { font-size: 1em !important; }"># 142, 3rd floor KMK Towers, KH Road Bangalore, Karnataka.</div>
                  </div>
                </div>
                <div class="tracking-section">
                  <div class="tracking-label">GATE PASS #</div>
                  <div class="tracking-number">${currentPackageData.gatePassSerialNumber || currentPackageData.gate_pass_serial_number || 'N/A'}</div>
                </div>
              </div>

              
              <div class="date-section" style="margin: 0 0 5px 0; padding: 8px 10px 0 10px; border: 1px solid #e2e8f0; border-radius: 6px; background: white; display: flex; align-items: center; justify-content: space-between;">
                <div class="date-item" style="flex: 1; padding-right: 10px;">
                  <div class="date-label" style="font-weight: 500; font-size: 13px; color: #4a5568; margin-bottom: 2px;">Issue Date</div>
                  <div class="date-value" style="font-size: 12px; font-weight: 600;">
                    ${currentPackageData.date ? (typeof currentPackageData.date === 'string' && currentPackageData.date.includes('T') ?
                    format(new Date(currentPackageData.date), 'MMM dd, yyyy') :
                    currentPackageData.date) : format(new Date(), 'MMM dd, yyyy')}
                  </div>
                </div>
                
                <div class="barcode-container" style="display: flex; flex-direction: column; align-items: center; margin: 0 15px;">
                  <div class="barcode-number" style="margin: 0; padding: 0; font-weight: 600; text-align: center; line-height: 1;">
                    <span style="font-size: 13px; letter-spacing: 0.5px; display: inline-block; margin-bottom: 2px;">
                      ${currentPackageData.trackingNumber || currentPackageData.tracking_number || 'N/A'}
                    </span>
                  </div>
                  ${(document.getElementById('barcode-svg')?.outerHTML || '').replace('height="50"', 'height="35"')}
                </div>

                <span style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 60px;
                    background-color: ${currentPackageData.isReturnable || currentPackageData.is_returnable ? '#e0f2fe' : '#fee2e2'};
                    color: ${currentPackageData.isReturnable || currentPackageData.is_returnable ? '#0369a1' : '#b91c1c'};
                    border: 1px solid ${currentPackageData.isReturnable || currentPackageData.is_returnable ? '#7dd3fc' : '#fecaca'};
                    border-radius: 4px;
                    padding: 3px 8px;
                    font-size: 16px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    height: 30px;
                    box-sizing: border-box;
                  ">
                    ${currentPackageData.isReturnable || currentPackageData.is_returnable ? 'RGP' : 'N-RGP'}
                  </span>

                <!--
                <div class="date-item" style="display: flex; flex-direction: column; gap: 2px; margin: 0;">
                  <div class="date-label" style="font-weight: bold; font-size: 14px; margin: 0; line-height: 1.1;">Priority</div>
                  <div class="date-value" style="margin: 0;">
                    <span class="priority-badge priority-${currentPackageData.priority || 'medium'}">
                      ${currentPackageData.priority || 'medium'}
                    </span>
                  </div>
                </div>
                -->
              </div>
              
              <div class="gate-pass-body" style="margin-top: 0; padding-top: 0;">
                <div class="gate-pass-details">
                  <div class="section-title" style="display: flex; align-items: center; gap: 8px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16v-2"></path>
                      <path d="M3.27 6.96 12 12.01l8.73-5.05"></path>
                      <path d="M12 22.08V12"></path>
                    </svg>
                    <span>Package Information</span>
                    
                  </div>
                  
                   <div class="detail-row">
                    <div class="detail-label">
                      <Building size={16} /> Requested By
                    </div>
                    <div class="detail-value">${currentPackageData.submittedByName || currentPackageData.submitted_by_name || user?.name || currentPackageData.submittedBy || currentPackageData.submitted_by || 'Not specified'}</div>
                  </div>
                  
                  <div class="detail-row">
                    <div class="detail-label">
                      <Building size={16} /> Consignee Name
                    </div>
                   <div class="detail-value">${currentPackageData.recipient || 'No recipient name provided'}</div>
                  </div>
                  
                  
                  <div class="detail-row">
                    <div class="detail-label">
                      <MapPin size={16} /> To Address
                    </div>
                    <div class="detail-value">${currentPackageData.toAddress || currentPackageData.to_address || 'No address provided'}</div>
                  </div>
                  
                  

                      <div class="detail-row">
                    <div class="detail-label">
                      <User size={16} /> Manager Name
                    </div>
                    <div class="detail-value">
                      ${currentPackageData.assignedToManagerName || currentPackageData.assigned_to_manager_name || currentPackageData.managerName || (currentPackageData.assigned_manager ? currentPackageData.assigned_manager.full_name : (currentPackageData.assignedToManager ? `Manager (ID: ${currentPackageData.assignedToManager})` : 'Not assigned'))}
                      ${currentPackageData.assignedToManagerName && currentPackageData.assignedToManagerName !== 'Sarah Manager' ? 
                        '<span class="returnable-tag">Authorized</span>' : ''}
                    </div>
                  </div>

                  <div class="detail-row">
                    <div class="detail-label">
                      <PackageIcon size={16} /> Number of Packages
                    </div>
                    <div class="detail-value">${currentPackageData.numberOfPackages || currentPackageData.number_of_packages || '1'}</div>
                  </div>

                  <!-- Package Items -->
                  ${(() => {
                    const allItems = [];
                    if (currentPackageData.common_dimension) {
                      allItems.push({ id: 'common', ...currentPackageData.common_dimension });
                    }
                    if (currentPackageData.additional_dimensions) {
                      allItems.push(...currentPackageData.additional_dimensions);
                    }

                    // Get all weight and dimension values from dimensions array
                    const weights = [];
                    const dimensions = [];
                    
                    if (currentPackageData.dimensions && currentPackageData.dimensions.length > 0) {
                      currentPackageData.dimensions.forEach(dim => {
                        if (dim.weight) {
                          weights.push(`${dim.weight}${dim.weight_unit || 'kg'}`);
                        }
                        if (dim.dimension) {
                          dimensions.push(dim.dimension);
                        }
                      });
                    }
                    
                    // Fallback to single values if no dimensions array
                    if (weights.length === 0) {
                      const fallbackWeight = currentPackageData.package_weight || currentPackageData.weight;
                      const fallbackWeightUnit = currentPackageData.package_weight_unit || currentPackageData.weight_unit || 'kg';
                      if (fallbackWeight) {
                        weights.push(`${fallbackWeight}${fallbackWeightUnit}`);
                      }
                    }
                    
                    if (dimensions.length === 0) {
                      const fallbackDimension = currentPackageData.package_dimension || currentPackageData.dimension;
                      if (fallbackDimension) {
                        dimensions.push(fallbackDimension);
                      }
                    }
                    
                    const weightDisplay = weights.length > 0 ? weights.join(', ') : 'N/A';
                    const dimensionDisplay = dimensions.length > 0 ? dimensions.join(', ') : 'N/A';
                    
                    return `
                      <!-- Weight Row -->
                      <div class="detail-row">
                        <div class="detail-label">
                          <Scale size={16} /> Weight
                        </div>
                        <div class="detail-value">
                          ${weightDisplay}
                        </div>
                      </div>
                      <!-- Dimensions Row -->
                      <div class="detail-row">
                        <div class="detail-label">
                          <Box size={16} /> Dimensions
                        </div>
                        <div class="detail-value">
                          ${dimensionDisplay}
                        </div>
                      </div>
                      <!-- Project Code Row -->
                      <div class="detail-row">
                        <div class="detail-label">
                          Project Code
                        </div>
                        <div class="detail-value">
                          ${currentPackageData.project_code || 'N/A'}
                        </div>
                      </div>
                    `;
                  })()}

                  <div class="detail-row" style="margin-bottom: 0; padding-bottom: 0;">
                    <div class="detail-label" style="align-self: flex-start; margin-top: 2px;">
                      <MessageSquare size={16} />Remarks
                    </div>
                    <div class="detail-value" style="margin-bottom: 0;">${currentPackageData.remarks || 'N/A'}</div>
                  </div>
                </div>
                
                <div class="gate-pass-barcode">
                  <div class="section-title" style="display: flex; align-items: center; gap: 8px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="1" y="3" width="15" height="13"></rect>
                      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                      <circle cx="5.5" cy="18.5" r="2.5"></circle>
                      <circle cx="18.5" cy="18.5" r="2.5"></circle>
                    </svg>
                    <span>Transportation Details</span>
                  </div>
                  <div class="detail-row" style="display: flex; align-items: center;">
                    <div class="detail-label" style="margin-right: 10px;">
                      <Truck size={16} /> Transportation Type:
                    </div>
                    <div class="detail-value" style="display: inline-flex; align-items: center; gap: 5px;">
                      <checked style="width: 16px; height: 16px; margin: 0; vertical-align: middle;" />
                      <span style="white-space: nowrap;">By Hand / Courier</span>
                    </div>
                  </div>
                  <div class="detail-row">
                    <div class="detail-label">
                      <Truck size={16} /> Carrier/Courier Name:
                    </div>
                    <div class="detail-value">${currentPackageData.courierName || currentPackageData.courier_name || ''} ${currentPackageData.carrierName || currentPackageData.carrier_name || ''}</div>
                  </div>
                  <div class="detail-row">
                    <div class="detail-label">
                      <Truck size={16} /> Vehicle/Tracking NO:
                    </div>
                    <div class="detail-value">${currentPackageData.courierTrackingNumber || currentPackageData.courier_tracking_number || ''} ${currentPackageData.vehicleDetails || currentPackageData.vehicle_details || ''}</div>
                  </div>
                  <div class="section-title" style="display: flex; align-items: center; gap: 8px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <line x1="10" y1="9" x2="8" y2="9"></line>
                    </svg>
                    <span>Order Details</span>
                  </div>
                  <div class="detail-row">
                    <div class="detail-label">
                      <FileText size={16} /> PO Number
                    </div>
                    <div class="detail-value">${currentPackageData.poNumber || currentPackageData.po_number || ''}</div>
                  </div>
                  <div class="detail-row">
                    <div class="detail-label">
                      <Calendar size={16} /> PO Date
                    </div>
                    <div class="detail-value">${
                      (() => {
                        const date = currentPackageData.poDate || currentPackageData.po_date;
                        if (!date) return '';
                        if (typeof date === 'string') {
                          return date.split('T')[0];
                        }
                        // If it's a Date object, format it as YYYY-MM-DD
                        return date.toISOString().split('T')[0];
                      })()
                    }</div>
                  </div>
                  <div class="detail-row">
                    <div class="detail-label">
                      <Truck size={16} /> Way Bill No
                    </div>
                    <div class="detail-value" style="min-width: 200px; display: inline-block;"></div>
                  </div>
                   <div class="section-title" style="display: flex; align-items: center; gap: 8px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 9l3-3 3 3"></path>
                      <path d="M21 15l-3 3-3-3"></path>
                      <path d="M6 12h14"></path>
                      <path d="M12 3v18"></path>
                    </svg>
                    <span>Return Information</span>
                  </div>
                  <div class="detail-row">
                    <div class="detail-label">
                      Return Date
                    </div>
                    <div class="detail-value" style="min-width: 200px; display: inline-block;">
                      ${currentPackageData.isReturnable || currentPackageData.is_returnable ? 
                        (() => {
                          const returnDate = currentPackageData.returnDate || currentPackageData.return_date;
                          return returnDate ? returnDate.substring(0, 10) : 'N/A';
                        })() : 
                        'N/A'}
                    </div>
                  </div>
                  <div class="detail-row">
                    <div class="detail-label">
                      Return Reason
                    </div>
                    <div class="detail-value" style="min-width: 200px; display: inline-block;">
                      ${currentPackageData.isReturnable || currentPackageData.is_returnable ? 
                        (currentPackageData.returnReason || currentPackageData.return_reason || 'N/A') : 
                        'N/A'}
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="items-section" style="page-break-inside: avoid;">
                <div class="section-title" style="display: flex; align-items: center; gap: 8px;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                  </svg>
                  <span>ITEM DETAILS</span>
                </div>
                <table class="items-table" style="width: 100%; border-collapse: collapse; page-break-inside: auto; font-size: 10px;">
                  <thead style="display: table-header-group;">
                    <tr style="page-break-inside: avoid; background-color: #f0f0f0;">
                      <th style="width: 15%; border: 1px solid #000; padding: 4px 8px; text-align: center; font-size: 10px;">Serial/Part No</th>
                      <th style="width: 12%; border: 1px solid #000; padding: 4px 8px; text-align: center; font-size: 10px;">HSN CODE</th>
                      <th style="width: 35%; border: 1px solid #000; padding: 4px 8px; text-align: center; font-size: 10px;">DESCRIPTION</th>
                      <th style="width: 8%; border: 1px solid #000; padding: 4px 8px; text-align: center; font-size: 10px;">QTY</th>
                      <th style="width: 15%; border: 1px solid #000; padding: 4px 8px; text-align: center; font-size: 10px;">UNIT PRICE</th>
                      <th style="width: 15%; border: 1px solid #000; padding: 4px 8px; text-align: center; font-size: 10px;">TAXABLE VALUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${currentPackageData.items && currentPackageData.items.length > 0 ? [
                      ...currentPackageData.items.map((item: Item) => `
                        <tr>
                          <td style="width: 15%; border: 1px solid #000; padding: 4px 8px; font-size: 10px; page-break-inside: avoid;">${getItemValue(item, 'serialNumber', 'serial_number')}</td>
                          <td style="width: 12%; border: 1px solid #000; padding: 4px 8px; font-size: 10px; page-break-inside: avoid;">${getItemValue(item, 'hsnCode', 'hsn_code')}</td>
                          <td style="width: 35%; border: 1px solid #000; padding: 4px 8px; font-size: 10px; page-break-inside: avoid;">${item.description || 'N/A'}</td>
                          <td style="width: 8%; border: 1px solid #000; padding: 4px 8px; text-align: center; font-size: 10px; page-break-inside: avoid;">${item.quantity || 'N/A'}</td>
                          <td style="width: 15%; border: 1px solid #000; padding: 4px 8px; font-size: 10px; page-break-inside: avoid;">${getItemValue(item, 'unitPrice', 'unit_price')}</td>
                          <td style="width: 15%; border: 1px solid #000; padding: 4px 8px; font-size: 10px; page-break-inside: avoid;">${item.purpose || 'N/A'}</td>
                        </tr>`),
                      `
                        <tr class="total-row" style="page-break-inside: avoid;">
                          <td colspan="5" style="text-align: center; font-weight: bold; border: 1px solid #000; padding: 4px 8px; font-size: 10px;">Total Value:</td>
                          <td style="font-weight: bold; border: 1px solid #000; padding: 4px 8px; font-size: 10px;">
                            ${currentPackageData.items.reduce((sum: number, item: any) => {
                              const unitPrice = getItemValue(item, 'unitPrice', 'unit_price');
                              const price = typeof unitPrice === 'string' 
                                ? parseFloat(unitPrice.replace(/[^0-9.-]+/g, '')) 
                                : Number(unitPrice) || 0;
                              const quantity = Number(item.quantity) || 0;
                              return sum + (price * quantity);
                            }, 0).toFixed(2)}
                          </td>
                        </tr>
                      `
                    ].join('') : 
                      `<tr>
                        <td colspan="6" class="no-items">No items specified</td>
                      </tr>`
                    }
                  </tbody>
                </table>
              </div>

             
                <div class="purpose-content" style="margin: 10px 0; padding: 8px; border: 1px solid #ddd; border-radius: 4px; min-height: 40px;">
                  <div style="font-size: 0.85em; line-height: 1.2;">Purpose: &nbsp;&nbsp;${currentPackageData.dimensions?.[0]?.purpose || currentPackageData.purpose || 'N/A'}</div>
                  <p style="margin: 2px 0 0 0; font-style: italic; color: #666; font-size: 0.65em;">(FOR OFFICE USE ONLY)</p>
                </div>
             
              <div class="footer-container">
                <div class="signatures">
                  <div class="signature-box">
                    <div class="signature-line"></div>
                    <div class="signature-title">Requested By</div>
                  </div>
                  <div class="signature-box">
                    <div class="signature-line"></div>
                    <div class="signature-title">Manager / Authorized</div>
                  </div>
                  <div class="signature-box">
                    <div class="signature-line"></div>
                    <div class="signature-title">Carrier / Received By</div>
                  </div>
                </div>
                <div class="security-notice" style="margin-top: 20px; padding: 8px; border-top: 1px dashed #ccc; text-align: center;">
                  <p style="margin: 0; font-size: 10px; line-height: 1.3; color: #666; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                    This gate pass must be presented at the security checkpoint for verification. Please ensure all items are properly packed and sealed before dispatch.
                  </p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      
      // Wait for the content to be fully loaded before printing
      printWindow.onload = () => {
        printWindow.focus();
        
        // Small delay to ensure all resources are loaded
        setTimeout(() => {
          printWindow.print();
          printWindow.onafterprint = () => printWindow.close();
        }, 500);
      };
    } catch (error) {
      console.error('Error during print preparation:', error);
      // Fallback to basic print if the enhanced version fails
      window.print();
    } finally {
      setIsPrinting(false);
    }
  };

  // Log the incoming package data for debugging
  console.log('GatePass component received package data:', packageData);
  console.log('Gate Pass Serial Number from props:', packageData.gatePassSerialNumber || packageData.gate_pass_serial_number);
  
  // Format date - either use the package date or current date if not available
  const formattedDate = packageData.date ? 
    (typeof packageData.date === 'string' && packageData.date.includes('T') ?
      format(new Date(packageData.date), 'MMM dd, yyyy') :
      packageData.date) : 
    format(new Date(), 'MMM dd, yyyy');
    
  // Assume company name as from address
  const fromAddress = "Rangsons Aerospace, Private Limited.";
  
  // Get the gate pass serial number, ensuring we check all possible field names
  const gatePassNumber = packageData.gatePassSerialNumber || 
                        packageData.gate_pass_serial_number || 
                        (packageData.id ? `GP-${new Date().toISOString().slice(2,10).replace(/-/g, '')}-OUT-${packageData.id.toString().padStart(4, '0')}` : 'N/A');
  


  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center">
          <Package size={20} style={{ marginRight: 8, color: '#1976d2' }} />
          <Typography variant="h5" component="h2" fontWeight="bold">Gate Pass</Typography>
        </Box>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={isPrinting ? <CircularProgress size={16} color="inherit" /> : <Printer size={16} />}
          onClick={handlePrint}
          disabled={isPrinting}
        >
          {isPrinting ? 'Printing...' : 'Print Gate Pass'}
        </Button>
      </Box>
      
      <StyledPaper ref={gatePassRef}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} pb={2} borderBottom={1} borderColor="divider">
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box bgcolor="primary.main" color="white" width={48} height={48} display="flex" alignItems="center" justifyContent="center" borderRadius={1} fontWeight="bold" fontSize={20}>
              RA
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="bold">Rangsons Aerospace</Typography>
              <Typography variant="caption" color="text.secondary">OFFICIAL GATE PASS</Typography>
            </Box>
          </Box>
          
          <Box textAlign="right">
            <Typography variant="caption" color="text.secondary" fontWeight="bold" textTransform="uppercase" letterSpacing={0.5} gutterBottom>
              Gate Pass #
            </Typography>
            <Typography variant="subtitle1" fontWeight="bold" color="primary.main">
              {gatePassNumber}
            </Typography>
          </Box>
        </Box>
        
        <Box mb={3} p={1.5} bgcolor="grey.100" borderRadius={1} border={1} borderColor="grey.300">
          <Box display="flex" justifyContent="space-between">
            <Box textAlign="center">
              <Typography variant="caption" color="text.secondary">Issue Date</Typography>
              <Typography variant="body2" fontWeight="medium">{formattedDate}</Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="caption" color="text.secondary">Tracking Number</Typography>
              <Typography variant="body2" fontWeight="medium">{packageData.trackingNumber || packageData.tracking_number || 'TRKO88ZI17M'}</Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="caption" color="text.secondary">Gate Pass Type</Typography>
              <Typography variant="body2" fontWeight="medium" sx={{
                bgcolor: (packageData.isReturnable || packageData.is_returnable) ? 'primary.light' : 'error.light',
                color: (packageData.isReturnable || packageData.is_returnable) ? 'primary.contrastText' : 'error.contrastText',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                textTransform: 'uppercase',
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.5px'
              }}>
                {(packageData.isReturnable || packageData.is_returnable) ? 'RGP' : 'N-RGP'}
              </Typography>
            </Box>
          </Box>
        </Box>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          <Box>
            <FieldBox>
              <Typography className="label">
                <Building size={16} /> From Address
              </Typography>
              <Typography className="value">{fromAddress}</Typography>
            </FieldBox>
          </Box>
          <Box>
            <FieldBox>
              <Typography className="label">
                <MapPin size={16} /> To Address
              </Typography>
              <Typography className="value">
                {packageData.to_address || packageData.toAddress || 'Not specified'}
              </Typography>
            </FieldBox>
          </Box>

          <Box sx={{ gridColumn: '1 / -1' }}>
            <FieldBox>
              <Typography className="label">
                <Package size={16} /> Description
              </Typography>
              <Typography className="value">{packageData.description || 'test1'}</Typography>
            </FieldBox>
          </Box>

          <Box sx={{ gridColumn: '1 / -1' }}>
            <FieldBox>
              <Typography className="label"><Scale size={14} /> Dimension</Typography>
              <Typography className="value">
                {(() => {
                  const dimensions = [];
                  if (currentPackageData.dimensions && currentPackageData.dimensions.length > 0) {
                    currentPackageData.dimensions.forEach(dim => {
                      if (dim.dimension) {
                        dimensions.push(dim.dimension);
                      }
                    });
                  }
                  if (dimensions.length === 0) {
                    const fallbackDimension = currentPackageData.package_dimension || currentPackageData.dimension;
                    if (fallbackDimension) {
                      dimensions.push(fallbackDimension);
                    }
                  }
                  return dimensions.length > 0 ? dimensions.join(', ') : 'N/A';
                })()}
              </Typography>
            </FieldBox>
          </Box>

          <Box>
            <FieldBox>
              <Typography className="label"><Scale size={14} /> Weight</Typography>
              <Typography className="value">
                {(() => {
                  const weights = [];
                  if (currentPackageData.dimensions && currentPackageData.dimensions.length > 0) {
                    currentPackageData.dimensions.forEach(dim => {
                      if (dim.weight) {
                        weights.push(`${dim.weight} ${dim.weight_unit || 'kg'}`);
                      }
                    });
                  }
                  if (weights.length === 0) {
                    const fallbackWeight = currentPackageData.package_weight || currentPackageData.weight;
                    const fallbackWeightUnit = currentPackageData.package_weight_unit || currentPackageData.weight_unit || 'kg';
                    if (fallbackWeight) {
                      weights.push(`${fallbackWeight} ${fallbackWeightUnit}`);
                    }
                  }
                  return weights.length > 0 ? weights.join(', ') : 'N/A';
                })()}
              </Typography>
            </FieldBox>
          </Box>

          <Box>
            <FieldBox>
              <Typography className="label">
                <User size={16} /> Authorized Manager
              </Typography>
              <Typography className="value">
                {currentPackageData.assigned_manager?.full_name || 
                 currentPackageData.assignedToManagerName || 
                 currentPackageData.assigned_to_manager_name || 
                 'Not assigned'}
                {(currentPackageData.assigned_manager || currentPackageData.assignedToManagerName || currentPackageData.assigned_to_manager_name) && (
                  <Box 
                    component="span" 
                    sx={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      bgcolor: 'success.light', 
                      color: 'success.contrastText',
                      fontSize: '0.75rem',
                      px: 0.75,
                      py: 0.25,
                      borderRadius: 1,
                      ml: 1
                    }}
                  >
                    <CheckCircle size={12} style={{ marginRight: '4px' }} /> Authorized
                  </Box>
                )}
              </Typography>
            </FieldBox>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />
        
        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            TRANSPORTATION DETAILS
          </Typography>
          <FieldBox>
            <Typography className="label">
              <Truck size={16} /> Transportation Type
            </Typography>
            <Typography className="value">
              {packageData.transportationType || packageData.transportation_type || 'Courier'}
            </Typography>
          </FieldBox>
        </Box>

        <Divider sx={{ my: 3 }} />
        
        {/* Barcode */}
        <Box mt={2} display="flex" flexDirection="column" alignItems="center" justifyContent="center">
          <Typography variant="caption" color="text.secondary" gutterBottom>
            GATE PASS VERIFICATION
          </Typography>
          <Box mb={1} textAlign="center">
            <Typography variant="body2" fontWeight="bold" color="primary.main" gutterBottom>
              {packageData.trackingNumber || packageData.tracking_number || 'TRKO88ZI17M'}
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="primary.main" gutterBottom>
              Gate Pass: {gatePassNumber}
            </Typography>
          </Box>
          <BarcodeGenerator
            value={packageData.trackingNumber || packageData.tracking_number || 'TRKO88ZI17M'}
            description={`Gate Pass: ${gatePassNumber}`}
          />
        </Box>
        
        <Box mt={4} display="flex" justifyContent="space-between">
          <Box>
            <Typography variant="body2" color="text.secondary">Security Signature</Typography>
            <Box mt={4} width={150} borderTop={1} borderColor="grey.400" />
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Manager Signature</Typography>
            <Box mt={4} width={150} borderTop={1} borderColor="grey.400" />
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Carrier Signature</Typography>
            <Box mt={4} width={150} borderTop={1} borderColor="grey.400" />
          </Box>
        </Box>

        <Box mt={3} pt={2} borderTop={1} borderColor="divider">
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            ITEM DETAILS
          </Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', mt: 2 }}>
              <Box component="thead">
                <Box component="tr" sx={{ bgcolor: 'grey.100' }}>
                  <Box component="th" sx={{ p: 1, textAlign: 'left', border: 1, borderColor: 'grey.300', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>SERIAL NUMBER</Box>
                  <Box component="th" sx={{ p: 1, textAlign: 'left', border: 1, borderColor: 'grey.300', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>HSN CODE</Box>
                  <Box component="th" sx={{ p: 1, textAlign: 'left', border: 1, borderColor: 'grey.300', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>DESCRIPTION</Box>
                  <Box component="th" sx={{ p: 1, textAlign: 'left', border: 1, borderColor: 'grey.300', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>QUANTITY</Box>
                  <Box component="th" sx={{ p: 1, textAlign: 'left', border: 1, borderColor: 'grey.300', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>UNIT PRICE</Box>
                  <Box component="th" sx={{ p: 1, textAlign: 'left', border: 1, borderColor: 'grey.300', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>TAXABLE VALUE</Box>
                </Box>
              </Box>
              <Box component="tbody">
                {currentPackageData.items && currentPackageData.items.length > 0 ? (
                  currentPackageData.items.map((item: Item, index: number) => (
                    <Box 
                      component="tr" 
                      key={index}
                      sx={{ 
                        bgcolor: index % 2 === 0 ? 'background.paper' : 'grey.50',
                        '&:hover': { bgcolor: 'grey.100' }
                      }}
                    >
                      <Box component="td" sx={{ p: 1, border: 1, borderColor: 'grey.300', fontSize: '0.75rem' }}>
                        {getItemValue(item, 'serialNumber', 'serial_number')}
                      </Box>
                      <Box component="td" sx={{ p: 1, border: 1, borderColor: 'grey.300', fontSize: '0.75rem' }}>
                        {getItemValue(item, 'hsnCode', 'hsn_code')}
                      </Box>
                      <Box component="td" sx={{ p: 1, border: 1, borderColor: 'grey.300', fontSize: '0.75rem' }}>
                        {item.description || 'N/A'}
                      </Box>
                      <Box component="td" sx={{ p: 1, border: 1, borderColor: 'grey.300', fontSize: '0.75rem' }}>
                        {item.quantity || 'N/A'}
                      </Box>
                      <Box component="td" sx={{ p: 1, border: 1, borderColor: 'grey.300', fontSize: '0.75rem' }}>
                        {getItemValue(item, 'unitPrice', 'unit_price')}
                      </Box>
                      <Box component="td" sx={{ p: 1, border: 1, borderColor: 'grey.300', fontSize: '0.75rem' }}>
                        {item.purpose || 'N/A'}
                      </Box>
                    </Box>
                  ))
                ) : (
                  <Box 
                    component="tr" 
                    sx={{ 
                      bgcolor: 'background.paper',
                      '&:hover': { bgcolor: 'grey.50' }
                    }}
                  >
                    <Box 
                      component="td" 
                      colSpan={6} 
                      sx={{ 
                        p: 2, 
                        textAlign: 'center', 
                        border: 1, 
                        borderColor: 'grey.300',
                        color: 'text.secondary',
                        fontStyle: 'italic',
                        fontWeight: 'medium',
                        fontSize: '0.875rem'
                      }}
                    >
                      No items specified in this package. This package does not contain any items.
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      </StyledPaper>
    </Box>
  );
};

export default GatePass;
