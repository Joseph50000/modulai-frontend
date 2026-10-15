import { base44, api } from "@/api/base44Client";

export const coreConfig = {};
export const getCoreSettings = async () => {
  try {
    const items = await base44.entities.CoreSettings.list();
    if (items && items.length > 0) return items[0];
    
    return await base44.entities.CoreSettings.create({
      default_provider: "local",
      default_model_id: "",
      default_model_name: "",
      default_embedding_model: "",
      default_vector_store: "",
      default_temperature: 0.2,
      default_token_limit: 1024,
      default_rag_strategy: "basic",
      default_validation_policy: "not_required",
      current_core_version: "1.0.0"
    });
  } catch (error) {
    console.error("Failed to load core settings:", error);
    return {};
  }
};
export const saveCoreSettings = async () => ({});
export const hashSecret = (s) => s;
export const testProviderConnection = async (provider) => {
  try {
    if (!provider?.endpoint_url) return { ok: true, message: "Aucun endpoint configuré." };

    // Test sécurisé via le proxy backend Node.js (évite les restrictions CORS du navigateur)
    const response = await api.post('/ai/provider/test', {
      endpoint_url: provider.endpoint_url,
      type: provider.type,
      api_key: provider.api_key || provider.secret_hash || provider.provider_key || "",
    });

    return response.data;
  } catch (error) {
    const msg = error.response?.data?.message || error.message || "Erreur de connexion";
    return { ok: false, message: msg };
  }
};
