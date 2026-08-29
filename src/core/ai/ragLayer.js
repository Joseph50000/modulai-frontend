import { api } from "@/api/base44Client";

export const ingestFile = async ({ knowledgeBaseId, file, metadata = {} }) => {
  const contentBase64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const response = await api.post("/rag/ingest/file", {
    knowledge_base_id: knowledgeBaseId,
    filename: file.name,
    content_base64: contentBase64,
    metadata,
  });
  return response.data;
};

export const ingestUrl = async ({ knowledgeBaseId, url, metadata = {} }) => {
  const response = await api.post("/rag/ingest/url", { knowledge_base_id: knowledgeBaseId, url, metadata });
  return response.data;
};

export const ingestSqlPreset = async ({ preset }) => {
  const response = await api.post(`/rag/ingest/sql/${encodeURIComponent(preset)}`);
  return response.data;
};

export const indexDocument = async (documentId) => {
  const response = await api.post("/rag/index", { document_id: documentId });
  return response.data.chunks || response.data.count || 0;
};

export const reindexKnowledgeBase = async (knowledgeBaseId) => {
  const response = await api.post(`/rag/reindex/${encodeURIComponent(knowledgeBaseId)}`);
  return response.data.documents || 0;
};

export const semanticSearch = async ({ knowledgeBaseId, query, topK = 5, filter } = {}) => {
  const response = await api.post("/rag/search", { knowledgeBaseId, query, topK, filter });
  return (response.data || []).map((result) => ({
    id: result.id,
    source: result.metadata?.document_name || result.metadata?.source || "Knowledge Base",
    passage: result.document || "",
    score: result.score ?? (1 / (1 + (result.distance || 0))),
    metadata: result.metadata || {},
  }));
};
