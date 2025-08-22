import { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Package, PackageStatus, User } from '../types';

interface PackageUpdateData {
  type: 'new' | 'update' | 'delete';
  package: Package;
}

interface PackageAssignmentData {
  package: Package;
  managerId: string;
}
import { useAuth } from './AuthContext';
import { packageService } from '../services/packageService';
import { userService } from '../services/userService';
import { socketService } from '../services/socketService';

interface PackageContextType {
  packages: Package[];
  assignedPackages: Package[]; // Packages assigned to the current manager
  managers: User[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  updatePackageStatus: (packageId: string, status: PackageStatus, notes?: string) => Promise<void>;
  updatePackageReturnStatus: (packageId: string, returnStatus: 'pending' | 'returned' | 'overdue', returnedBy?: string, returnNotes?: string, returnedDateTime?: string) => Promise<void>;
  submitPackage: (packageData: FormData) => Promise<Package>;
  filterPackagesByStatus: (status: PackageStatus) => Package[];
  getPackageById: (id: string) => Package | undefined;
  assignPackageToManager: (packageId: string, managerId: string) => Promise<void>;
  getPackagesByManager: (managerId: string) => Package[];
}

const PackageContext = createContext<PackageContextType | undefined>(undefined);

export const PackageProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [packages, setPackages] = useState<Package[]>([]);
  const [assignedPackages, setAssignedPackages] = useState<Package[]>([]);
  const [managers, setManagers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Function to refresh data from the database
  const refreshData = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      // For managers, fetch all packages so they can see analytics for all packages they've processed
      if (user && user.role === 'manager') {
        // Fetch all packages for analytics
        const allPackages = await packageService.getAllPackages();
        setPackages(allPackages);
        
        // Also fetch packages specifically assigned to this manager for the assigned packages list
        const packagesForManager = await packageService.getAllPackages(user.id);
        setAssignedPackages(packagesForManager);
        
        console.log('Fetched all packages for manager analytics:', allPackages.length);
        console.log('Fetched assigned packages for manager:', packagesForManager.length);
      } else {
        // For other roles, fetch all packages
        const allPackages = await packageService.getAllPackages();
        setPackages(allPackages);
      }
      
      // Fetch managers from database
      const fetchedManagers = await userService.getAllManagers();
      setManagers(fetchedManagers);
    } catch (error) {
      console.error('Error fetching data from database:', error);
      
      // Handle authentication errors specifically
      if (error instanceof Error) {
        if (error.message.includes('authentication') || error.message.includes('log in')) {
          setError('Authentication required. Please log in to continue.');
        } else {
          setError(`Failed to load data: ${error.message}`);
        }
      } else {
        setError('Failed to load data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Effect to load data on mount and when user changes
  useEffect(() => {
    if (user) {
      console.log('PackageContext initialized with user:', user.email, 'role:', user.role);
      
      // Initial data load
      refreshData();
      
      // Connect to WebSocket server
      socketService.connect(user);
      
      // Set up WebSocket event listeners for real-time updates
      const unsubscribePackageUpdate = socketService.onPackageUpdate((data: PackageUpdateData) => {
        console.log('WebSocket: Package update received', data);
        
        // Immediately update the packages state
        if (data.type === 'new') {
          console.log('Adding new package to state');
          setPackages(prevPackages => [data.package, ...prevPackages]);
          
          // If user is a manager, check if this package is assigned to them
          if (user.role === 'manager' && data.package.assignedToManager === user.id) {
            console.log('New package assigned to current manager, updating assignedPackages');
            setAssignedPackages(prevAssigned => [data.package, ...prevAssigned]);
          }
        } else {
          // For other updates, refresh all data to ensure consistency
          console.log('Other package update, refreshing all data');
          refreshData();
        }
      });
      
      // For managers, listen to direct package assignments
      const unsubscribePackageAssigned = socketService.onPackageAssigned((data: PackageAssignmentData) => {
        console.log('WebSocket: Package assigned specifically to current manager', data);
        
        // If user is a manager, immediately update the assigned packages
        if (user.role === 'manager') {
          console.log('Updating assigned packages for current manager');
          setAssignedPackages((prevAssigned: Package[]) => {
            // Check if package is already in the list
            const exists = prevAssigned.some((p: Package) => p.id === data.package.id);
            if (!exists) {
              return [data.package, ...prevAssigned];
            }
            return prevAssigned;
          });
          
          // Also update the main packages list if needed
          setPackages(prevPackages => {
            const index = prevPackages.findIndex(p => p.id === data.package.id);
            if (index >= 0) {
              // Update existing package
              const updatedPackages = [...prevPackages];
              updatedPackages[index] = data.package;
              return updatedPackages;
            } else {
              // Add new package
              return [data.package, ...prevPackages];
            }
          });
        }
      });
      
      // Clean up on unmount
      return () => {
        unsubscribePackageUpdate();
        unsubscribePackageAssigned();
        socketService.disconnect();
      };
    }
  }, [user]);

  const getPackagesByStatus = (status: PackageStatus): Package[] => {
    return packages.filter((pkg) => pkg.status === status);
  };

  const getPackageById = (id: string): Package | undefined => {
    return packages.find((pkg) => pkg.id === id);
  };

  const addPackage = async (pkg: FormData): Promise<Package> => {
    if (!user) {
      throw new Error('User must be logged in to add a package');
    }

    try {
      // Add package to database using packageService
      // The 'submittedBy' field should now be part of the FormData from the client.
      // If it's not, the backend (server.js) needs to be adjusted or it needs to be appended to FormData here.
      // For now, assuming client sends it or backend handles it if user is available via session.
      // If user.id MUST be added here, it needs to be appended to the FormData object 'pkg'.
      pkg.append('submittedBy', user.id);

      const newPackage = await packageService.addPackage(pkg);
      // After successful submission, refresh data or add to local state
      // Refresh packages after adding
      await refreshData();
      
      return newPackage;
    } catch (error) {
      console.error('Error adding package:', error);
      throw error;
    }
  };

  const updatePackageStatus = async (id: string, status: PackageStatus, notes?: string): Promise<void> => {
    console.log(`[PackageContext] Updating package ${id} status to ${status}`, { notes });
    
    // Save the current packages for potential rollback
    const previousPackages = [...packages];
    
    try {
      // Create an update object with common fields
      const update: Partial<Package> = {
        status,
        notes: notes ? (previousPackages.find(p => p.id === id)?.notes ? 
          `${previousPackages.find(p => p.id === id)?.notes}\n${notes}` : notes) : undefined
      };
      
      // Set timestamps based on status
      const now = new Date();
      if (status === 'approved') {
        update.approvedAt = now;
        update.approvedBy = user?.id;
        console.log(`[PackageContext] Set approvedAt to ${update.approvedAt}`);
      } else if (status === 'dispatched') {
        update.dispatchedAt = now;
        console.log(`[PackageContext] Set dispatchedAt to ${update.dispatchedAt}`);
      } else if (status === 'rejected') {
        update.rejectedAt = now;
        update.rejectedBy = user?.id;
        console.log(`[PackageContext] Set rejectedAt to ${update.rejectedAt}`);
      }
      
      // Optimistically update the local state
      console.log('[PackageContext] Optimistically updating local state');
      setPackages(prevPackages => {
        const updated = prevPackages.map(pkg => 
          pkg.id === id ? { ...pkg, ...update } : pkg
        );
        console.log('[PackageContext] Main packages updated', { before: prevPackages, after: updated });
        return updated;
      });

      // Also update assigned packages if needed
      if (user?.role === 'manager') {
        setAssignedPackages(prevAssigned => {
          const updated = prevAssigned.map(pkg => 
            pkg.id === id ? { ...pkg, ...update } : pkg
          );
          console.log('[PackageContext] Assigned packages updated', { before: prevAssigned, after: updated });
          return updated;
        });
      }
      
      // Update package status in the database
      console.log('[PackageContext] Calling packageService.updatePackageStatus');
      const updatedPackage = await packageService.updatePackageStatus(id, status, notes);
      console.log('[PackageContext] packageService.updatePackageStatus completed', updatedPackage);
      
      // Update local state with the updated package
      setPackages(prevPackages => 
        prevPackages.map(pkg => pkg.id === id ? updatedPackage : pkg)
      );
      
      // Also update assigned packages if user is a manager
      if (user?.role === 'manager') {
        setAssignedPackages(prevAssigned => 
          prevAssigned.map(pkg => pkg.id === id ? updatedPackage : pkg)
        );
      }
    } catch (error) {
      console.error('Error updating package status:', error);
      
      // Revert to previous state on error
      setPackages(previousPackages);
      
      // Re-throw the error to be handled by the component
      throw error;
    }
  };

  const updatePackageReturnStatus = async (packageId: string, returnStatus: 'pending' | 'returned' | 'overdue', returnedBy?: string, returnNotes?: string, returnedDateTime?: string): Promise<void> => {
    try {
      console.log('Updating package return status:', { packageId, returnStatus, returnedBy, returnNotes, returnedDateTime });
      
      // Update package return status in database
      await packageService.updatePackageReturnStatus(packageId, returnStatus, returnedBy, returnNotes, returnedDateTime);
      
      // Force a refresh of all packages and the current package
      console.log('Refreshing package data after return status update...');
      await Promise.all([
        refreshData(),
        // If we're viewing the package detail page, refresh that specific package
        packageId && packageService.getPackageById(packageId).then(updatedPackage => {
          console.log('Refreshed package data:', updatedPackage);
        }).catch(err => {
          console.error('Error refreshing single package:', err);
        })
      ]);
      
      console.log('Package return status updated and data refreshed');
    } catch (error) {
      console.error('Error updating package return status:', error);
      throw error;
    }
  };

  const assignPackageToManager = async (packageId: string, managerId: string): Promise<void> => {
    try {
      // Assign package to manager in database
      await packageService.assignPackageToManager(packageId, managerId);
      
      // Refresh packages after assignment
      await refreshData();
    } catch (error) {
      console.error('Error assigning package to manager:', error);
      throw error;
    }
  };

  const getPackagesByManager = (managerId: string): Package[] => {
    return packages.filter((pkg) => pkg.assignedToManager === managerId);
  };

  return (
    <PackageContext.Provider value={{
      packages,
      assignedPackages,
      managers,
      loading,
      error,
      refreshData,
      updatePackageStatus,
      updatePackageReturnStatus,
      submitPackage: addPackage,
      filterPackagesByStatus: getPackagesByStatus,
      getPackageById,
      assignPackageToManager,
      getPackagesByManager
    }}>
      {children}
    </PackageContext.Provider>
  );
};

export const usePackages = () => {
  const context = useContext(PackageContext);
  if (context === undefined) {
    throw new Error('usePackages must be used within a PackageProvider');
  }
  return context;
};