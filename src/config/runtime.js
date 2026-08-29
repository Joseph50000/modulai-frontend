const configuredApiUrl = import.meta.env.VITE_API_URL || '/api';

export const API_URL = configuredApiUrl.replace(/\/$/, '');
export const AI_CORE_URL = (import.meta.env.VITE_AI_CORE_URL || 'http://localhost:8001').replace(/\/$/, '');

export const dynamicGatewayUrl = (path = '') => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}/dynamic${cleanPath}`;
};

export default {
  API_URL,
  AI_CORE_URL,
  dynamicGatewayUrl,
};

// En développement, VITE_API_URL vide utilise le proxy Vite local `/api`.
// En production, VITE_API_URL peut être une URL absolue.
// VITE_AI_CORE_URL sert aux contrôles directs du service AI Core.
