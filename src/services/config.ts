// Configuration for FastAPI backend
export const API_CONFIG = {
  BASE_URL: 'http://localhost:8080/api',
  UPLOAD_URL: 'http://localhost:8080/uploads',
  WEBSOCKET_URL: 'ws://localhost:8080',
  
  // Update these URLs in your service files:
  // - authService.ts: change API_URL to API_CONFIG.BASE_URL + '/auth'
  // - packageService.ts: change API_URL to API_CONFIG.BASE_URL
  // - userService.ts: change API_URL to API_CONFIG.BASE_URL
  // - socketService.ts: change socket URL to API_CONFIG.WEBSOCKET_URL
};

// Example updated service configuration:
// const API_URL = API_CONFIG.BASE_URL;
// const AUTH_URL = `${API_CONFIG.BASE_URL}/auth`;
// const PACKAGES_URL = `${API_CONFIG.BASE_URL}/packages`;
