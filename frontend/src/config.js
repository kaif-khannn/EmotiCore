/**
 * frontend/src/config.js
 * ---------------------
 * Centralized API configuration for the EmotiCore frontend.
 */

// Toggle this between local development and production
// In a real CI/CD environment, this would be an environment variable (import.meta.env.VITE_API_URL)
const IS_PRODUCTION = true; 

export const API_BASE_URL = IS_PRODUCTION 
    ? 'https://emoticore.onrender.com' 
    : 'http://127.0.0.1:8000';

export const getApiUrl = (path) => {
    // Ensure path starts with a slash
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_URL}${normalizedPath}`;
};
