import { base44 } from "@/api/base44Client";

export async function executeModuleUseCase({ projectId, projectName, moduleVersionId, useCaseKey, inputData, provider, user, outputSchema }) {
  
  let mockOutput = {};
  if (outputSchema && Array.isArray(outputSchema)) {
    outputSchema.forEach(field => {
      if (field.type === "string") mockOutput[field.name] = `Mocked ${field.name} content...`;
      else if (field.type === "number") mockOutput[field.name] = 42;
      else if (field.type === "boolean") mockOutput[field.name] = true;
      else if (field.type === "array") mockOutput[field.name] = ["Mock Item 1", "Mock Item 2"];
      else mockOutput[field.name] = { mock: "data" };
    });
  } else {
    mockOutput = { result: "Mock execution result from full-stack backend!" };
  }

  const execution = {
    project_id: projectId,
    project_name: projectName,
    module_name: moduleVersionId,
    use_case: useCaseKey,
    provider: provider || "OpenAI",
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
    output: mockOutput
  };
  
  try {
    const created = await base44.entities.AIExecution.create(execution);
    // Rename id to execution_id to match UseCaseRunner expectations
    return { ...created, execution_id: created.id };
  } catch (e) {
    console.error("Failed to record AI execution:", e);
    throw e;
  }
}
export const SchemaTypes = ["string", "number", "boolean", "array", "object"];
export const FIELD_TYPES = ["string", "number", "boolean", "array", "object"];
