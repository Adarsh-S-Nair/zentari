export function getApiBaseUrl() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'localhost:8000';
  const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
  const cleanBaseUrl = baseUrl.replace(/^https?:\/\//, '');
  return `${protocol}://${cleanBaseUrl}`;
} 