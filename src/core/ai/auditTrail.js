import { base44 } from "@/api/base44Client";

export async function recordAudit(data) {
  try {
    return await base44.entities.AuditEvent.create(data);
  } catch (e) {
    console.error("Failed to record audit:", e);
    return null;
  }
}
