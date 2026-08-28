import { base44 } from "@/api/base44Client";

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
    if (!provider.endpoint_url) return { ok: true, message: "Aucun endpoint configuré." };
    
    const url = provider.endpoint_url.replace(/\/$/, '');
    
    // Si c'est un modèle de type local/Ollama, on peut tester l'endpoint /api/version
    if (provider.type === 'local' || provider.type === 'mock') {
      try {
        const res = await fetch(`${url}/api/version`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!res.ok) {
          return { ok: false, message: `L'API a répondu avec une erreur HTTP ${res.status} ${res.statusText}` };
        }
        
        const data = await res.json();
        return { ok: true, message: `Connecté avec succès. Ollama Version : ${data.version || 'inconnue'}` };
      } catch (err) {
        return { ok: false, message: `Impossible de se connecter : ${err.message}. (Vérifiez l'URL ou les règles CORS)` };
      }
    }
      
    // Pour les autres providers, on fait un test générique
    return { ok: true, message: `URL configurée. (Test approfondi non disponible pour le type ${provider.type})` };
  } catch (error) {
    return { ok: false, message: error.message };
  }
};
