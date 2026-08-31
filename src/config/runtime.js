const configuredApiUrl = import.meta.env.VITE_API_URL || '/api';

export const API_URL = configuredApiUrl.replace(/\/$/, '');
export const AI_CORE_URL = (import.meta.env.VITE_AI_CORE_URL || 'http://localhost:8001').replace(/\/$/, '');

export const dynamicGatewayUrl = (path = '') => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}/dynamic${cleanPath}`;
};

// URL destinée aux appels externes (cURL, Postman, intégrations tierces).
// En développement, VITE_API_URL peut rester relatif pour utiliser le proxy Vite,
// mais un cURL copié doit recevoir une URL absolue via VITE_PUBLIC_API_URL.
export const publicGatewayUrl = (path = '') => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const publicApiUrl = (import.meta.env.VITE_PUBLIC_API_URL || import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  if (/^https?:\/\//i.test(publicApiUrl)) return `${publicApiUrl}/dynamic${cleanPath}`;
  return new URL(`${API_URL}/dynamic${cleanPath}`, window.location.origin).toString();
};

export default {
  API_URL,
  AI_CORE_URL,
  dynamicGatewayUrl,
  publicGatewayUrl,
};

// En développement, VITE_API_URL vide utilise le proxy Vite local `/api`.
// En production, VITE_API_URL peut être une URL absolue.
// VITE_AI_CORE_URL sert aux contrôles directs du service AI Core.
