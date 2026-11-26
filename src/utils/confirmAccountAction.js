export async function confirmAccountAction(dialog, options) {
  const reason = await dialog.prompt({ ...options, defaultValue: "", confirmLabel: "Continue", minLength: 3, maxLength: 500 });
  if (typeof reason !== "string" || reason.trim().length < 3) return null;
  const trimmed = reason.trim();
  const confirmed = await dialog.confirm({
    title: options.title,
    description: `${options.description || "This account action will be recorded in the audit log."}\n\nReason: ${trimmed}`,
    confirmLabel: options.confirmLabel || "Confirm account action",
    tone: options.tone || "warning",
  });
  return confirmed ? trimmed : null;
}
