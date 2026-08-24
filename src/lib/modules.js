import { CORE_VERSION } from "./platform";

// Slugify a module name into a stable identifier (kept across versions).
export function slugify(str) {
  const s = (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "module";
}

export function defaultDataSources() {
  return [
    { name: "Base de données", type: "database", enabled: true },
    { name: "Documents", type: "documents", enabled: false },
    { name: "Vector Store", type: "vector_store", enabled: false },
    { name: "API externe", type: "api", enabled: false },
    { name: "Historique", type: "history", enabled: false },
  ];
}

export function defaultDependencies() {
  return [{ name: "AI Core", type: "core", version: ">=" + CORE_VERSION }];
}

export function defaultConfiguration() {
  return {
    provider: "mock",
    model: "",
    temperature: 0.2,
    max_tokens: 1024,
    rag_enabled: false,
    human_validation_required: true,
    audit_enabled: true,
  };
}

// Group module records by module_key, each group sorted by version (desc).
export function groupByVersion(modules) {
  const map = new Map();
  for (const m of modules || []) {
    const key = m.module_key || slugify(m.name);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(m);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => (b.version || "").localeCompare(a.version || "", "en", { numeric: true }));
  }
  return Array.from(map.entries()).map(([key, versions]) => ({ key, versions, latest: versions[0] }));
}

export function latestPublishedOf(versions) {
  return (versions || []).find((v) => v.lifecycle === "published") || (versions || [])[0];
}

// Compute the next semver from a current version.
export function nextVersion(current, kind = "patch") {
  const parts = String(current || "0.1.0")
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);
  if (kind === "major") {
    parts[0] += 1; parts[1] = 0; parts[2] = 0;
  } else if (kind === "minor") {
    parts[1] += 1; parts[2] = 0;
  } else {
    parts[2] += 1;
  }
  return parts.join(".");
}

export function featureKeyOf(name) {
  return slugify(name);
}