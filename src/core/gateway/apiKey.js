export async function generateApiKey() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const randomHex = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  
  const fullKey = `sk_proj_${randomHex}`;
  const prefix = `sk_proj_${randomHex.slice(0, 8)}`;
  
  const hash = await hashSecret(fullKey);
  
  return { fullKey, prefix, hash };
}

export async function hashSecret(secret) {
  const encoder = new TextEncoder();
  const data = encoder.encode(secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function maskKey(prefix) { 
  if (!prefix) return "sk_proj_***";
  return `${prefix}***`; 
}

export function prefixFromKey(key) { 
  if (!key) return "sk_proj";
  return key.substring(0, 16);
}

export function newRequestId() { 
  return "req_" + crypto.randomUUID().replace(/-/g, ""); 
}

export const ENV_LABEL = { development: "Dev", staging: "Staging", production: "Prod" };
