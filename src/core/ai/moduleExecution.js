import { base44 } from "@/api/base44Client";

export async function executeModuleUseCase(projectId, moduleKey, useCaseKey, inputData, user) {
  const execution = {
    project_name: projectId,
    use_case: useCaseKey,
    module_name: moduleKey,
    provider: "OpenAI",
    model: "gpt-4-turbo",
    status: "success",
    prompt_name: useCaseKey,
    prompt_version: "1.0.0",
    execution_time: Math.floor(Math.random() * 2000) + 500,
    user_name: user?.full_name || user?.email || "System",
    context_reference: {
      "base_de_donnees": true,
      "historique": false
    },
    input_reference: inputData,
    output: { result: "Mock execution result from full-stack backend!" }
  };
  
  try {
    await base44.entities.AIExecution.create(execution);
  } catch (e) {
    console.error("Failed to record AI execution:", e);
  }
  
  return execution.output;
}
export const SchemaTypes = ["string", "number", "boolean", "array", "object"];
export const FIELD_TYPES = ["string", "number", "boolean", "array", "object"];
