/**
 * Centralized API configuration for EmotiCore.
 * Prepend this to all API calls to ensure they hit the correct backend.
 */

// In development, we prefer hitting the local backend directly.
// In production deployments (Cloudflare), we point to the Render backend.
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const API_BASE_URL = isLocal 
  ? 'http://localhost:8000' 
  : 'https://kaifkhan77-emoticore-api.hf.space';

export default {
  API_BASE_URL,
};
