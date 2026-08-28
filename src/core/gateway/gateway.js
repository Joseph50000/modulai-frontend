import { api } from "@/api/base44Client";

export async function runGateway({ apiKey, path, method, body, clientName, projectId }) {
  try {
    // Appel direct au Node Gateway
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const res = await api.post(`/dynamic${cleanPath}`, body, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "x-project-id": projectId || ""
      }
    });
    return { success: true, status_code: 200, data: res.data, request_id: "req_" + Date.now() };
  } catch (e) {
    return { success: false, status_code: e.response?.status || 500, error: e.response?.data?.error || e.message, request_id: "req_" + Date.now() };
  }
}
