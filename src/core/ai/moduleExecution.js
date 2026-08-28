import { base44, api } from "@/api/base44Client";

export async function executeModuleUseCase({ projectId, projectName, moduleVersionId, useCaseKey, inputData, provider, user, outputSchema }) {
  
  // 1. Récupérer le module complet pour trouver l'endpoint d'exécution
  const module = await base44.entities.Module.get(moduleVersionId);
  
  let endpointPath = null;
  if (module.endpoints) {
    try {
      const endpoints = typeof module.endpoints === "string" ? JSON.parse(module.endpoints) : module.endpoints;
      const endpoint = endpoints.find(e => e.use_case_key === useCaseKey);
      if (endpoint) {
        endpointPath = endpoint.path.replace(/^\/+/, '');
      }
    } catch (e) {
      console.error("Impossible de parser les endpoints du module", e);
    }
  }

  if (!endpointPath) {
    throw new Error(`Aucun endpoint (API) configuré dans ce module pour le Use Case "${useCaseKey}". Veuillez configurer un endpoint API dans le module d'abord.`);
  }

  // 2. Appel dynamique au Gateway sans coder le domaine en dur
  try {
    const res = await api.post(`/dynamic/${endpointPath}`, inputData, {
      headers: {
        'x-project-id': projectId || '',
        'x-project-name': projectName || ''
      }
    });
    const data = res.data;

    // Le Gateway ou l'AI Core a créé l'enregistrement dans AIExecution.
    // Mais on doit retourner le résultat formaté pour le composant UseCaseRunner.
    // L'AI Core renvoie: { status: 'success', result: '{...json...}', rag_context_used: bool }
    
    // On parse le résultat s'il s'agit d'un JSON texte renvoyé par le LLM
    let parsedOutput = data.result;
    try {
      if (typeof parsedOutput === 'string') {
        parsedOutput = JSON.parse(parsedOutput);
      }
    } catch (e) { /* ignore */ }

    // On récupère le dernier log de la DB (car le gateway l'a inséré)
    // C'est un peu un hack, l'idéal serait que l'API nous retourne l'ID de l'exécution
    const executions = await base44.entities.AIExecution.list("-created_date", 1);
    const lastExecutionId = executions.length > 0 ? executions[0].id : "unknown";

    return {
      status: "success",
      execution_id: lastExecutionId,
      execution_time: 1500, // On peut mettre une valeur par défaut ou utiliser la DB
      prompt: { name: useCaseKey, version: "1.0.0" },
      provider: "Ollama",
      output: parsedOutput,
      context_summary: {
        "base_de_donnees": data.rag_context_used
      }
    };
  } catch (e) {
    console.error("Failed to execute AI:", e);
    const errorMessage = e.response?.data?.error || e.response?.data?.message || e.message;
    throw new Error(errorMessage);
  }
}
export const SchemaTypes = ["string", "number", "boolean", "array", "object"];
export const FIELD_TYPES = ["string", "number", "boolean", "array", "object"];
