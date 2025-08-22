import React, { useState, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, ScanLine, RefreshCw } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan }) => {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scannerReady, setScannerReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const scannerId = 'barcode-scanner';
  
  useEffect(() => {
    // Clean up on unmount
    return () => {
      stopScanner();
    };
  }, []);
  
  const startScanner = async () => {
    setError(null);
    setIsScanning(true);
    
    try {
      const html5QrCode = new Html5Qrcode(scannerId);
      
      const qrCodeSuccessCallback = (decodedText: string) => {
        onScan(decodedText);
        html5QrCode.stop();
        setIsScanning(false);
      };
      
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };
      
      // This will start the scanner
      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        qrCodeSuccessCallback,
        undefined
      );
      
      setScannerReady(true);
    } catch (err) {
      console.error("Error starting scanner:", err);
      setError("Unable to access camera. Please ensure you've granted camera permissions.");
      setIsScanning(false);
    }
  };
  
  const stopScanner = () => {
    if (isScanning) {
      try {
        const html5QrCode = new Html5Qrcode(scannerId);
        html5QrCode.stop().catch(err => console.error("Error stopping scanner:", err));
      } catch (err) {
        console.error("Error accessing scanner instance:", err);
      }
      setIsScanning(false);
      setScannerReady(false);
    }
  };
  
  return (
    <div className="mt-4 mb-6">
      <div className="mb-3 flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center">
          <QrCode className="h-5 w-5 mr-1 text-blue-600" />
          Barcode Scanner
        </h3>
        
        {isScanning ? (
          <button
            onClick={stopScanner}
            className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
          >
            Stop Scanning
          </button>
        ) : (
          <button
            onClick={startScanner}
            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition flex items-center"
          >
            <ScanLine className="h-4 w-4 mr-1" />
            Start Scanner
          </button>
        )}
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-md flex items-center justify-between">
          <span>{error}</span>
          <button 
            onClick={() => setError(null)}
            className="text-red-700 hover:text-red-900"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      )}
      
      <div 
        id={scannerId} 
        className={`w-full h-64 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center ${isScanning ? 'border-blue-400' : ''}`}
      >
        {!isScanning && (
          <div className="text-center text-slate-500">
            <ScanLine className="h-8 w-8 mx-auto mb-2" />
            <p>Click "Start Scanner" to scan a barcode</p>
          </div>
        )}
        {isScanning && !scannerReady && (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-slate-600">Initializing camera...</span>
          </div>
        )}
      </div>
      
      {isScanning && (
        <p className="mt-2 text-sm text-slate-600 text-center">
          Position the barcode within the scanner view
        </p>
      )}
    </div>
  );
};

export default BarcodeScanner;