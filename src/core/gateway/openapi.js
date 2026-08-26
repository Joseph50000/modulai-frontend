export function generateOpenAPI(project, moduleRecords, baseUrl) {
  return { openapi: "3.0.0", info: { title: project?.name || "API", version: "1.0.0" }, paths: {} };
}
export function listScopes(moduleRecords) {
  const seen = new Set();
  (moduleRecords || []).forEach((m) => {
    (m.endpoints || []).forEach((ep) => {
      (ep.required_scopes || []).forEach((s) => seen.add(s));
    });
  });
  return Array.from(seen);
}
