export const moderationOutcomes = Object.freeze([
  { value: "NO_ACTION", label: "No action", description: "Close the report without changing the content or the person’s account.", tone: "neutral" },
  { value: "HIDDEN", label: "Hide content", description: "The reported content is removed from public view but retained for review and records.", tone: "content" },
  { value: "REMOVED", label: "Remove content", description: "The reported content is removed and is no longer available to other people.", tone: "content" },
  { value: "WARNING", label: "Send warning", description: "The person receives an account warning, but can continue using the platform.", tone: "warning" },
  { value: "POSTING_RESTRICTED", label: "Restrict posting", description: "The person cannot publish through posting-protected creation routes for the selected period.", tone: "restriction", temporary: true },
  { value: "SELLING_RESTRICTED", label: "Restrict selling", description: "The person cannot use selling-protected actions or request payouts for the selected period.", tone: "restriction", temporary: true },
  { value: "MESSAGING_RESTRICTED", label: "Restrict messaging", description: "The person cannot send messages or use restricted conversation actions for the selected period.", tone: "restriction", temporary: true },
  { value: "ACCOUNT_RESTRICTED", label: "Restrict login", description: "The person cannot sign in or use the platform until the selected period ends.", tone: "danger", temporary: true, confirmation: true },
  { value: "SUSPENDED", label: "Suspend account", description: "The account is disabled and remains inaccessible until an administrator restores it.", tone: "danger", confirmation: true },
  { value: "BANNED", label: "Ban account", description: "The account is blocked from the platform and requires administrator intervention to restore.", tone: "critical", confirmation: true },
]);

export const moderationOutcome = (value) => moderationOutcomes.find((item) => item.value === value);
export const moderationOutcomeLabel = (value) => moderationOutcome(value)?.label || String(value || "").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
export const moderationOutcomeDescription = (value) => moderationOutcome(value)?.description || "";
