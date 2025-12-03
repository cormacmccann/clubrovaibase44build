import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "692f5001b4dc63e1f492857f", 
  requiresAuth: true // Ensure authentication is required for all operations
});
