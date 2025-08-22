// Socket service disabled for FastAPI migration
// FastAPI doesn't include Socket.IO by default
// This is a placeholder for future WebSocket implementation

export const socketService = {
  // No-op functions for compatibility
  connect: (_user: any) => console.log('WebSocket disabled - FastAPI migration'),
  disconnect: () => console.log('WebSocket disconnected'),
  onPackageUpdate: (_callback: any) => () => {}, // Return unsubscribe function
  onPackageAssigned: (_callback: any) => () => {}, // Return unsubscribe function
  emitPackageStatusChange: (_packageId: number, _status: string) => {},
  removeAllListeners: () => {}
};
