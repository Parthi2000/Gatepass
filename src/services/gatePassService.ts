import { authService } from './authService';

const API_URL = 'http://localhost:8080/api';

export interface GatePassSequence {
  id: number;
  financial_year: string;
  pass_type: string;
  current_sequence: number;
  created_at: string;
  updated_at?: string;
}

export interface GatePassGenerateRequest {
  is_returnable: boolean;
}

export interface GatePassGenerateResponse {
  gate_pass_number: string;
  financial_year: string;
  pass_type: string;
  sequence_number: number;
}

/**
 * Gate Pass API service
 */
export const gatePassService = {
  /**
   * Generate a new gate pass number
   */
  async generateGatePassNumber(isReturnable: boolean = false): Promise<GatePassGenerateResponse> {
    try {
      const token = authService.getToken();
      
      if (!token) {
        throw new Error('No authentication token found. Please log in.');
      }
      
      const response = await fetch(`${API_URL}/gate-pass/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_returnable: isReturnable })
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          authService.logout();
          throw new Error('Authentication failed. Please log in again.');
        }
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Generated gate pass:', data);
      return data;
    } catch (error) {
      console.error('Error generating gate pass number:', error);
      throw error;
    }
  },

  /**
   * Get all gate pass sequences (admin only)
   */
  async getAllSequences(): Promise<GatePassSequence[]> {
    try {
      const token = authService.getToken();
      
      if (!token) {
        throw new Error('No authentication token found. Please log in.');
      }
      
      const response = await fetch(`${API_URL}/gate-pass/sequences`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          authService.logout();
          throw new Error('Authentication failed. Please log in again.');
        }
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching gate pass sequences:', error);
      throw error;
    }
  },

  /**
   * Get gate pass sequences for a specific financial year
   */
  async getSequencesByYear(financialYear: string): Promise<GatePassSequence[]> {
    try {
      const token = authService.getToken();
      
      if (!token) {
        throw new Error('No authentication token found. Please log in.');
      }
      
      const response = await fetch(`${API_URL}/gate-pass/sequences/${financialYear}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          authService.logout();
          throw new Error('Authentication failed. Please log in again.');
        }
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching sequences by year:', error);
      throw error;
    }
  },

  /**
   * Update a gate pass sequence (admin only)
   */
  async updateSequence(sequenceId: number, currentSequence: number): Promise<GatePassSequence> {
    try {
      const token = authService.getToken();
      
      if (!token) {
        throw new Error('No authentication token found. Please log in.');
      }
      
      const response = await fetch(`${API_URL}/gate-pass/sequences/${sequenceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ current_sequence: currentSequence })
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          authService.logout();
          throw new Error('Authentication failed. Please log in again.');
        }
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating sequence:', error);
      throw error;
    }
  },

  /**
   * Get current financial year
   */
  async getCurrentFinancialYear(): Promise<{ financial_year: string }> {
    try {
      const response = await fetch(`${API_URL}/gate-pass/current-year`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching current financial year:', error);
      throw error;
    }
  },

  /**
   * Validate gate pass number format
   */
  validateGatePassNumber(gatePassNumber: string): boolean {
    const regex = /^RAPL-(?:RGP|NRGP)-\d{4}\/\d{3}$/;
    return regex.test(gatePassNumber);
  }
};
