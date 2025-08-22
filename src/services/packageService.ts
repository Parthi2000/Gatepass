import { Package, PackageStatus } from '../types';
import { authService } from './authService';

const API_URL = 'http://localhost:8080/api';

/**
 * Package-related API operations
 */
export const packageService = {
  /**
   * Get all packages with filtering and search
   * @param managerId Optional manager ID to filter packages
   * @param search Optional search query
   * @param status Optional status filter
   * @param startDate Optional start date filter
   * @param endDate Optional end date filter
   * @param priority Optional priority filter
   * @param sortBy Optional sort field
   */
  async getAllPackages(
    managerId?: string,
    search?: string,
    status?: string,
    startDate?: string,
    endDate?: string,
    priority?: string,
    sortBy?: string
  ): Promise<Package[]> {
    try {
      const url = new URL(`${API_URL}/packages`);
      
      if (managerId) url.searchParams.append('manager_id', managerId);
      if (search) url.searchParams.append('search', search);
      if (status) url.searchParams.append('status', status);
      if (startDate) url.searchParams.append('start_date', startDate);
      if (endDate) url.searchParams.append('end_date', endDate);
      if (priority) url.searchParams.append('priority', priority);
      if (sortBy) url.searchParams.append('sort_by', sortBy);
      
      const token = authService.getToken();
      // Extract dimension info from dimensions array
     
      // Debug: Log token status
      console.log('Token status:', {
        hasToken: !!token,
        tokenLength: token?.length || 0,
        tokenPreview: token ? `${token.substring(0, 10)}...` : 'null'
      });
      
      if (!token) {
        throw new Error('No authentication token found. Please log in.');
      }
      
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Clear invalid token and redirect to login
          authService.logout();
          throw new Error('Authentication failed. Please log in again.');
        }
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Package data from FastAPI:', data);
      
      // FastAPI returns snake_case by default
      return data.map((pkg: any) => {
        // Extract description from first item in items array
        const itemDescription = pkg.items && pkg.items.length > 0 ? pkg.items[0].description : '';
        
        // Extract dimension info from dimensions array
        const dimensionInfo = pkg.dimensions && pkg.dimensions.length > 0 ? {
          weight: pkg.dimensions[0].weight,
          weight_unit: pkg.dimensions[0].weight_unit,
          dimension: pkg.dimensions[0].dimension,
          purpose: pkg.dimensions[0].purpose
        } : {};
        
        // Extract manager info if available
        const managerInfo = pkg.assigned_manager ? {
          assignedManager: {
            id: pkg.assigned_manager.id.toString(),
            fullName: pkg.assigned_manager.full_name || pkg.assigned_manager.fullName || 'Unknown',
            email: pkg.assigned_manager.email || ''
          },
          assigned_to_manager: pkg.assigned_to_manager || pkg.assignedToManager,
          assignedToManager: pkg.assigned_to_manager || pkg.assignedToManager
        } : {
          assignedManager: null,
          assigned_to_manager: null,
          assignedToManager: null
        };

        // Extract return info from return_records if available
        const returnRecord = pkg.return_records && pkg.return_records.length > 0 ? pkg.return_records[0] : null;
        const returnInfo = returnRecord ? {
          returned_by: returnRecord.returned_by,
          returnedBy: returnRecord.returned_by,
          returned_at: returnRecord.returned_at,
          returnedAt: returnRecord.returned_at,
          return_notes: returnRecord.return_notes,
          returnNotes: returnRecord.return_notes,
          return_status: returnRecord.status,
          returnStatus: returnRecord.status
        } : {};

        return {
          id: pkg.id.toString(),
          trackingNumber: pkg.tracking_number || pkg.trackingNumber,
          description: itemDescription || pkg.description || '',
          remarks: pkg.remarks || '',
          purpose: pkg.purpose || '',
          recipient: pkg.recipient || '',
          projectCode: pkg.project_code || pkg.projectCode || '',
          poNumber: pkg.po_number || pkg.poNumber,
          poDate: pkg.po_date || pkg.poDate,
          notes: pkg.notes || '',
          priority: pkg.priority || 'medium',
          status: pkg.status || 'submitted',
          updated_at: pkg.updated_at,
          toAddress: pkg.to_address || pkg.toAddress || '',
          
          // Submission info
          submittedBy: pkg.submitted_by || pkg.submittedBy,
          submitted_by: pkg.submitted_by || pkg.submittedBy,
          submittedByName: pkg.submitted_by_name || pkg.submittedByName,
          submitted_at: pkg.submitted_at || pkg.submittedAt,
          submitted_by_user: pkg.submitted_by_user,
          submittedAt: new Date(pkg.submitted_at || pkg.submittedAt),
          
          // Assignment info (provided by managerInfo spread)
          
          // Approval info
          approvedBy: pkg.approved_by || pkg.approvedBy,
          approvedAt: pkg.approved_at ? new Date(pkg.approved_at) : undefined,
          
          // Rejection info
          rejectedBy: pkg.rejected_by || pkg.rejectedBy,
          rejected_by: pkg.rejected_by || pkg.rejectedBy,
          rejectedAt: pkg.rejected_at || pkg.rejectedAt ? new Date(pkg.rejected_at || pkg.rejectedAt) : undefined,
          rejected_at: pkg.rejected_at || pkg.rejectedAt,
          rejected_by_name: pkg.rejected_by_user?.full_name || pkg.rejected_by_name || pkg.rejectedByName,
          rejected_by_user: pkg.rejected_by_user || pkg.rejectedByUser,
          
          // Dispatch info
          dispatchedAt: pkg.dispatched_at ? new Date(pkg.dispatched_at) : undefined,
          
          // Return info
          return_date: pkg.return_date || pkg.returnDate,
          returnDate: pkg.return_date || pkg.returnDate,
          isReturnable: pkg.is_returnable || pkg.isReturnable,
          is_returnable: pkg.is_returnable || pkg.isReturnable,
          return_status: pkg.return_status || pkg.returnStatus,
          returnStatus: pkg.return_status || pkg.returnStatus,
          
          
          // Gate pass info
          gate_pass_serial_number: pkg.gate_pass_serial_number || pkg.gatePassSerialNumber,
          gatePassSerialNumber: pkg.gate_pass_serial_number || pkg.gatePassSerialNumber,

          
          // Manager and return info from spread operators
          ...managerInfo,
          ...returnInfo,
          
          // Dimension data
          ...dimensionInfo,
          
          // Items and dimensions arrays
          items: pkg.items || [],
          dimensions: pkg.dimensions || []
        };
      });
    } catch (error) {
      console.error('Error fetching packages:', error);
      throw error;
    }
  },

  

  /**
   * Add a new package
   */
  async addPackage(pkg: FormData): Promise<Package> {
    try {
      const token = authService.getToken();
      const response = await fetch(`${API_URL}/packages/create-with-files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: pkg,
      });
      
      console.log('API response status:', response.status, response.statusText);
      
      if (!response.ok) {
        let errorMessage = `API error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          console.error('Detailed validation error:', errorData);
          if (errorData.detail) {
            if (typeof errorData.detail === 'string') {
              errorMessage = errorData.detail;
            } else if (Array.isArray(errorData.detail)) {
              errorMessage = errorData.detail.map((item: any) => 
                typeof item === 'string' ? item : `${item.loc?.join('.')} - ${item.msg}`
              ).join(', ');
            } else {
              errorMessage = JSON.stringify(errorData.detail);
            }
          }
        } catch (e) {
          const errorText = await response.text();
          console.error('Error response text:', errorText);
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      // Extract description from first item in items array
      const itemDescription = data.items && data.items.length > 0 ? data.items[0].description : '';
      
      // Extract dimension info from dimensions array
      const dimensionInfo = data.dimensions && data.dimensions.length > 0 ? {
        weight: data.dimensions[0].weight,
        weight_unit: data.dimensions[0].weight_unit,
        dimension: data.dimensions[0].dimension,
        purpose: data.dimensions[0].purpose
      } : {};
      
      return {
        id: data.id.toString(),
        trackingNumber: data.tracking_number || data.trackingNumber,
        description: itemDescription || data.description || '',
        remarks: data.remarks || '',
        purpose: data.purpose || '',
        rejectedAt: data.rejected_at ? new Date(data.rejected_at) : undefined,
        
        updated_at: data.updated_at,
        recipient: data.recipient || '',
        projectCode: data.project_code || data.projectCode || '',
        poNumber: data.po_number || data.poNumber,
        poDate: data.po_date || data.poDate,
        notes: data.notes || '',
        priority: data.priority || 'medium',
        status: data.status || 'submitted',
        submittedBy: data.submitted_by || data.submittedBy,
        submittedAt: new Date(data.submitted_at || data.submittedAt),
        toAddress: data.to_address || data.toAddress || '',
        approvedAt: data.approved_at ? new Date(data.approved_at) : undefined,
        dispatchedAt: data.dispatched_at ? new Date(data.dispatched_at) : undefined,
        // Add dimension data
        ...dimensionInfo,
        // Add items array for detailed view
        items: data.items || [],
        dimensions: data.dimensions || []
      };
    } catch (error) {
      console.error('Error adding package:', error);
      throw error;
    }
  },

  /**
   * Update package status
   */
  async updatePackageStatus(id: string, status: PackageStatus, notes?: string): Promise<Package> {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token found. Please log in.');
      }
      
      const url = `${API_URL}/packages/${id}/status`;
      const requestBody: { status: string; notes?: string } = { status };
      
      if (notes) {
        requestBody.notes = notes;
      }
      
      console.log('Sending update package status request:', { url, requestBody });
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('Error response from server:', responseData);
        const errorMessage = responseData.detail || responseData.message || 
                           response.statusText || 'Failed to update package status';
        throw new Error(errorMessage);
      }
      
      console.log('Successfully updated package status:', responseData);
      
      // Return the updated package data
      if (responseData.package) {
        return this.mapPackageData(responseData.package);
      }
      
      // If the response doesn't include the package, fetch it
      const updatedPackage = await this.getPackageById(id);
      if (!updatedPackage) {
        throw new Error(`Package with ID ${id} not found after status update`);
      }
      return updatedPackage;
      
    } catch (error) {
      console.error('Error in updatePackageStatus:', error);
      throw error;
    }
  },

  /**
   * Assign package to manager
   */
  async assignPackageToManager(packageId: string, managerId: string): Promise<void> {
    try {
      const token = authService.getToken();
      const response = await fetch(`${API_URL}/packages/${packageId}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          manager_id: managerId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to assign package to manager');
      }
    } catch (error) {
      console.error('Error assigning package to manager:', error);
      throw error;
    }
  },

  /**
   * Get a package by ID directly from the API
   */
  async getPackageById(id: string): Promise<Package | null> {
    try {
      const token = authService.getToken();
      const response = await fetch(`${API_URL}/packages/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Package with ID ${id} not found`);
          return null;
        } else if (response.status === 401) {
          console.error('Authentication failed - token may be invalid or expired');
          // Optionally trigger logout
          authService.logout();
          window.location.href = '/login';
          return null;
        }
        throw new Error(`API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      return this.mapPackageData(data);
    } catch (error) {
      console.error(`Error getting package with ID ${id}:`, error);
      return null;
    }
  },

  /**
   * Get package details with all weight sections
   */
  async getPackageWithWeights(id: string): Promise<Package | null> {
    try {
      const token = authService.getToken();
      const response = await fetch(`${API_URL}/packages/${id}/with-weights`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Package with ID ${id} not found`);
          return null;
        } else if (response.status === 401) {
          console.error('Authentication failed - token may be invalid or expired');
          // Optionally trigger logout
          authService.logout();
          window.location.href = '/login';
          return null;
        }
        throw new Error(`API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Process the package data with weight sections
      return this.mapPackageData({
        ...data,
        // Add the weight sections to the package
        common_dimension: data.common_dimension || null,
        additional_dimensions: data.additional_dimensions || []
      });
    } catch (error) {
      console.error(`Error getting package with weights for ID ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Map raw package data to the Package type
   */
  mapPackageData(data: any): Package {
    // Extract dimension info from dimensions array if available
    const dimensionInfo = data.dimensions && data.dimensions.length > 0 ? {
      weight: data.dimensions[0].weight,
      weight_unit: data.dimensions[0].weight_unit,
      dimension: data.dimensions[0].dimension,
      purpose: data.dimensions[0].purpose
    } : {};

    // Extract manager info if available
    const managerInfo = data.assigned_manager ? {
      assignedManager: {
        id: data.assigned_manager.id.toString(),
        fullName: data.assigned_manager.full_name || data.assigned_manager.fullName || 'Unknown',
        email: data.assigned_manager.email || ''
      },
      assigned_to_manager: data.assigned_to_manager || data.assignedToManager,
      assignedToManager: data.assigned_to_manager || data.assignedToManager
    } : {
      assignedManager: null,
      assigned_to_manager: null,
      assignedToManager: null
    };

    // Extract return info from return_records if available
    const returnRecord = data.return_records && data.return_records.length > 0 ? data.return_records[0] : null;
    const returnInfo = returnRecord ? {
      returned_by: returnRecord.returned_by,
      returnedBy: returnRecord.returned_by,
      returned_at: returnRecord.returned_at,
      returnedAt: returnRecord.returned_at ? new Date(returnRecord.returned_at) : undefined,
      return_notes: returnRecord.return_notes,
      returnNotes: returnRecord.return_notes,
      return_status: returnRecord.status,
      returnStatus: returnRecord.status
    } : {};

    // Extract submitted by user info if available
    const submittedByUser = data.submitted_by_user || data.submittedByUser;
    const submittedByName = submittedByUser 
      ? (submittedByUser.full_name || submittedByUser.name || 
         `${submittedByUser.first_name || ''} ${submittedByUser.last_name || ''}`.trim() || 
         submittedByUser.email || 'Unknown User')
      : (data.submitted_by_name || data.submittedByName || '');

    return {
      id: data.id ? data.id.toString() : '',
      trackingNumber: data.tracking_number || data.trackingNumber || '',
      description: data.description || '',
      recipient: data.recipient || '',
      projectCode: data.project_code || data.projectCode || '',
      poNumber: data.po_number || data.poNumber,
      poDate: data.po_date || data.poDate,
      purpose: data.purpose || '',
      notes: data.notes || '',
      priority: (data.priority || 'medium') as 'low' | 'medium' | 'high',
      status: (data.status || 'submitted') as 'submitted' | 'approved' | 'rejected' | 'dispatched',
      submittedBy: submittedByUser?.id?.toString() || data.submitted_by || data.submittedBy || '',
      submittedByName: submittedByName,
      submitted_by_name: submittedByName,
      submitted_by_user: submittedByUser,
      submittedAt: new Date(data.submitted_at || data.submittedAt || Date.now()),
      rejectedAt: data.rejected_at ? new Date(data.rejected_at) : undefined,
      rejected_at: data.rejected_at,
      rejectedBy: data.rejected_by || data.rejectedBy,
      toAddress: data.to_address || data.toAddress || '',
      approvedAt: data.approved_at ? new Date(data.approved_at) : undefined,
      dispatchedAt: data.dispatched_at ? new Date(data.dispatched_at) : undefined,
      weight: data.weight || null,
      remarks: data.remarks || data.remarks || '', // Ensure remarks is included even if empty
      weight_unit: data.weight_unit || 'kg',
      weightUnit: data.weight_unit || 'kg',
      dimension: data.dimension || null,
      dimensions: data.dimensions || [],
      ...dimensionInfo,
      ...managerInfo,
      ...returnInfo,
      items: data.items || [],
      // Include any additional fields that might be needed
      ...(data.gate_pass_serial_number && { gatePassSerialNumber: data.gate_pass_serial_number }),
      ...(data.gate_pass_serial_number && { gate_pass_serial_number: data.gate_pass_serial_number }),
      ...(data.return_date && { returnDate: data.return_date }),
      ...(data.return_date && { return_date: data.return_date }),
      ...(data.is_returnable !== undefined && { isReturnable: data.is_returnable }),
      ...(data.is_returnable !== undefined && { is_returnable: data.is_returnable }),
      // Remove the duplicate remarks spread since it's already set above
    };
  },

  /**
   * Create a return record for a package
   */
  async createReturn(returnData: {
    packageId: string;
    returnedBy: string;
    returnNotes: string;
    returnedDate: string;
    returnedTime: string;
  }): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/returns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageId: returnData.packageId,
          returnedBy: returnData.returnedBy,
          returnNotes: returnData.returnNotes,
          returnDate: returnData.returnedDate,
          returnTime: returnData.returnedTime
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create return record');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating return record:', error);
      throw error;
    }
  },

  /**
   * Update package return status with return details
   */
  async updatePackageReturnStatus(
    id: string, 
    returnStatus: 'pending' | 'returned' | 'overdue', 
    returnedBy?: string, 
    returnNotes?: string, 
    returnedDateTime?: string
  ): Promise<any> {  // Changed return type to any to return the response data
    try {
      const token = authService.getToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Prepare the request body with consistent field names
      const requestBody: any = {
        returnStatus: returnStatus
      };
      
      // Only include these fields if they are provided
      if (returnedBy) requestBody.returnedBy = returnedBy;
      if (returnNotes) requestBody.returnNotes = returnNotes;
      if (returnedDateTime) requestBody.returnedAt = returnedDateTime;
      
      console.log('Sending return update request to:', `${API_URL}/packages/${id}/return`);
      console.log('Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(`${API_URL}/packages/${id}/return`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(requestBody)
      });
      
      console.log('Response status:', response.status);
      
      // Parse the response as JSON if possible
      let responseData;
      const responseText = await response.text();
      
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
        console.log('Response data:', responseData);
      } catch (e) {
        console.log('Non-JSON response:', responseText);
        responseData = {};
      }
      
      if (!response.ok) {
        console.error('Error response:', responseText);
        let errorMessage = `Failed to update package return status: ${response.statusText}`;
        
        if (responseData && responseData.detail) {
          errorMessage = responseData.detail;
        } else if (responseText) {
          errorMessage = responseText;
        }
        
        const error = new Error(errorMessage);
        (error as any).response = response;
        (error as any).responseData = responseData;
        throw error;
      }
      
      // Return the response data for the caller to use
      return responseData;
    } catch (error) {
      console.error('Error updating package return status:', error);
      throw error;
    }
  }
};
