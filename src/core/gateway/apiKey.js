export function generateApiKey() { return "sk_proj_mock_key_123"; }
export function hashSecret(secret) { return secret; }
export function maskKey(key) { return "sk_proj_***"; }
export function prefixFromKey(key) { return "sk_proj"; }
export function newRequestId() { return "req_mock_123"; }
export const ENV_LABEL = { development: "Dev", production: "Prod" };
