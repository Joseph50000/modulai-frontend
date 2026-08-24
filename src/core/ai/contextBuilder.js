export const buildContext = (params) => {
  return params;
};

export const contextToPrompt = (ctx) => {
  if (!ctx) return "";
  
  let prompt = [];
  
  if (ctx.promptInstructions) {
    prompt.push("=== INSTRUCTIONS ===");
    prompt.push(ctx.promptInstructions);
    prompt.push("");
  }
  
  if (ctx.rules && ctx.rules.length > 0) {
    prompt.push("=== REGLES METIER ===");
    ctx.rules.forEach(r => prompt.push("- " + r));
    prompt.push("");
  }
  
  if (ctx.structuredData && Object.keys(ctx.structuredData).length > 0) {
    prompt.push("=== DONNEES STRUCTUREES ===");
    prompt.push(JSON.stringify(ctx.structuredData, null, 2));
    prompt.push("");
  }
  
  if (ctx.history && ctx.history.length > 0) {
    prompt.push("=== HISTORIQUE ===");
    ctx.history.forEach(h => prompt.push(h));
    prompt.push("");
  }
  
  if (ctx.documents && ctx.documents.length > 0) {
    prompt.push("=== DOCUMENTS COMPLETS ===");
    ctx.documents.forEach(d => {
      prompt.push(`Document: ${d.name}`);
      prompt.push(d.content);
      prompt.push("");
    });
  }
  
  if (ctx.searchResults && ctx.searchResults.length > 0) {
    prompt.push("=== EXTRAITS DE LA BASE DE CONNAISSANCES (RAG) ===");
    ctx.searchResults.forEach(r => {
      prompt.push(`Source: ${r.source}`);
      prompt.push(r.passage);
      prompt.push("");
    });
  }
  
  return prompt.join("\n");
};

export const contextSummary = (ctx) => {
  if (!ctx) return {};
  return {
    structured_data: ctx.structuredData && Object.keys(ctx.structuredData).length > 0,
    documents: (ctx.documents || []).length,
    search_results: (ctx.searchResults || []).length,
    history: (ctx.history || []).length,
    rules: (ctx.rules || []).length
  };
};
