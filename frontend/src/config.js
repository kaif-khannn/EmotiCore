/**
 * Centralized API configuration for EmotiCore.
 * Prepend this to all API calls to ensure they hit the correct backend.
 */

// We use an empty string in development if we want to rely on the Vite proxy,
// or a hardcoded URL to bypass the proxy entirely.
// For production transparency, we default to the Render URL.
export const API_BASE_URL = 'https://emoticore.onrender.com';

export default {
  API_BASE_URL,
};
