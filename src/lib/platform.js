export const PLATFORM_NAME = "AI Application Platform";
export const CORE_VERSION = "1.0.0";
export const DEFAULT_PROVIDER = "mock";

export const PROVIDER_OPTIONS = [
  { value: "mock", label: "Mock Provider", description: "Génération locale déterministe (sans coût)" },
  { value: "openai", label: "OpenAI", description: "Modèles GPT via le AI Core" },
  { value: "anthropic", label: "Anthropic", description: "Modèles Claude via le AI Core" },
  { value: "gemini", label: "Google Gemini", description: "Modèles Gemini via le AI Core" },
];