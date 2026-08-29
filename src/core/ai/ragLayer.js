import { api } from "@/api/base44Client";

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
