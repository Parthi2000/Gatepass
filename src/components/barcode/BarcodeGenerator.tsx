import React from 'react';
import Barcode from 'react-barcode';
import { Printer } from 'lucide-react';

interface BarcodeGeneratorProps {
  value: string;
  description?: string;
}

const BarcodeGenerator: React.FC<BarcodeGeneratorProps> = ({ value, description }) => {
  const printBarcode = () => {
    const printContent = document.getElementById('barcode-container');
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Barcode: ${value}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .barcode-wrapper { text-align: center; padding: 20px; border: 1px dashed #ccc; }
            .description { margin: 10px 0; font-size: 14px; }
            .tracking { font-weight: bold; font-size: 16px; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="barcode-wrapper">
            ${printContent.innerHTML}
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };
  
  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-slate-800">Package Barcode</h3>
        <button
          onClick={printBarcode}
          className="flex items-center px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          <Printer className="h-4 w-4 mr-1" />
          Print
        </button>
      </div>
      
      <div 
        id="barcode-container" 
        className="bg-white p-4 border border-slate-200 rounded-lg flex flex-col items-center"
      >
        <div className="tracking text-center mb-2 font-bold text-lg">{value}</div>
        {description && <div className="description text-center mb-2 text-sm text-slate-600">{description}</div>}
        <Barcode 
          value={value} 
          displayValue={false} // This will hide the text below the barcode
        />
      </div>
    </div>
  );
};

export default BarcodeGenerator;