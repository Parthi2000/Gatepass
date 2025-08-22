/**
 * Utility for generating meaningful Gate Pass Serial Numbers
 * Now uses backend API for persistent sequence management
 */

import { gatePassService } from '../services/gatePassService';

/**
 * Generates a Gate Pass Serial Number with the format:
 * RAPL-[RGP|NRGP]-[FY]/[SEQ]
 * 
 * Where:
 * - RAPL: Company code
 * - RGP: Returnable Gate Pass
 * - NRGP: Non-Returnable Gate Pass
 * - FY: Financial year (e.g., 2526 for 2025-26)
 * - SEQ: 3-digit sequence number (resets each financial year)
 * 
 * @param isReturnable Whether the package is returnable
 * @returns Promise resolving to a formatted gate pass serial number
 */
export const generateGatePassNumber = async (isReturnable: boolean = false): Promise<string> => {
  try {
    const response = await gatePassService.generateGatePassNumber(isReturnable);
    return response.gate_pass_number;
  } catch (error) {
    console.error('Failed to generate gate pass number:', error);
    // Fallback to client-side generation if API fails
    return generateFallbackGatePassNumber(isReturnable);
  }
};

/**
 * Fallback client-side gate pass generation (for offline scenarios)
 * @param isReturnable Whether the package is returnable
 * @returns A formatted gate pass serial number
 */
const generateFallbackGatePassNumber = (isReturnable: boolean = false): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  
  // Financial year starts in April (month 4)
  const financialYearStart = month >= 4 ? year : year - 1;
  const financialYearEnd = financialYearStart + 1;
  const financialYear = `${financialYearStart.toString().slice(-2)}${financialYearEnd.toString().slice(-2)}`;
  
  const passType = isReturnable ? 'RGP' : 'NRGP';
  const timestamp = Date.now().toString().slice(-3); // Use last 3 digits of timestamp as fallback sequence
  
  return `RAPL-${passType}-${financialYear}/${timestamp}`;
};

/**
 * Validates if a gate pass number follows the correct format
 * 
 * @param gatePassNumber The gate pass number to validate
 * @returns True if the format is valid, false otherwise
 */
export const isValidGatePassNumber = (gatePassNumber: string): boolean => {
  // Check if the gate pass number matches the expected format
  const regex = /^RAPL-(?:RGP|NRGP)-\d{4}\/\d{3}$/;
  return regex.test(gatePassNumber);
};
