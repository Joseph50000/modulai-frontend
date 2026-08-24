export function generateOpenAPI(project, moduleRecords, baseUrl) {
  return { openapi: "3.0.0", info: { title: project?.name || "API", version: "1.0.0" }, paths: {} };
}
export function listScopes(moduleRecords) {
  return ["execute"];
}
