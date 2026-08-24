// Risk module configuration — owned by the module, consumed by the AI Core.
// The module defines its own output schema, required fields and prompt name;
// the Core stays generic and validates against whatever the module declares.

export const RISK_PROMPT_NAME = "risk-analysis";

export const RISK_REQUIRED_FIELDS = [
  "probability",
  "impact",
  "severity",
  "justification",
  "recommendations",
];

export const RISK_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    probability: { type: "number", description: "Score de probabilité de 1 à 5" },
    impact: { type: "number", description: "Score d'impact de 1 à 5" },
    severity: { type: "number", description: "Score de sévérité de 1 à 5" },
    severity_label: { type: "string" },
    dominant_causes: { type: "array", items: { type: "string" } },
    missing_information: { type: "array", items: { type: "string" } },
    justification: { type: "array", items: { type: "string" } },
    recommendations: { type: "array", items: { type: "string" } },
    confidence: { type: "number" },
    data_sources_used: { type: "array", items: { type: "string" } },
  },
};

export const RISK_RULES = [
  "Échelle de probabilité : 1 (très faible) à 5 (très élevée)",
  "Échelle d'impact : 1 (négligeable) à 5 (catastrophique)",
  "Sévérité = moyenne de la probabilité et de l'impact",
  "Toujours justifier chaque score par les données fournies",
];