const messages = {
  INSUFFICIENT_STARS: "You do not have enough Stars. Stars purchasing is not available yet; please contact the platform administrator.",
  CREATOR_REVERSAL_INSUFFICIENT_STARS: "The creator Wallet cannot cover this reversal. No refund was committed; manual review is required.",
  ALREADY_ENTITLED: "This World is already in your purchases.", MEMBERSHIP_ALREADY_ACTIVE: "Your Premium membership is already active.",
  IDEMPOTENCY_CONFLICT: "This request conflicts with an earlier action. Close this dialog and start a new action.", COMMAND_PROCESSING: "This action is already processing. Retry with the same action shortly.",
  PUBLICATION_NOT_PURCHASABLE: "This publication is not currently available for purchase.", SELF_PURCHASE_NOT_REQUIRED: "You already have creator access to this publication.",
  ENTITLEMENT_REVOKED: "This World entitlement is no longer active.", MEMBERSHIP_EXPIRED: "This Premium membership is no longer active.", TRANSACTIONS_REQUIRED: "The financial service is temporarily unavailable.",
  WALLET_REQUIRES_MIGRATION: "This Wallet requires administrator review before it can be used.", WALLET_MIGRATION_REQUIRED: "This Wallet requires administrator review before it can be used.",
  DUPLICATE_WALLETS: "Duplicate Wallet records require administrator review.", WALLET_DUPLICATE: "Duplicate Wallet records require administrator review.",
  ADMIN_CREDITS_DISABLED: "Manual Stars credits are disabled in this environment.", ADMIN_STAR_CREDITS_DISABLED: "Manual Stars credits are disabled in this environment.",
  REFUND_ALREADY_PROCESSED: "This refund was already processed.", FINANCIAL_RATE_LIMITED: "Too many financial requests. Retry shortly with the same action.", INVALID_FINANCIAL_ID: "Enter a valid record identifier.",
};
export const financialErrorCode = (error) => error?.response?.data?.code || "";
export function financialErrorMessage(error, fallback = "Unable to complete this financial action.") { const code = financialErrorCode(error); if (messages[code]) return messages[code]; if (error?.response?.status === 401) return "Please sign in to continue."; if (error?.response?.status === 403) return "You are not authorized to perform this action."; if (error?.response?.status === 404) return "The requested financial record was not found."; if (!error?.response) return "The financial service is unavailable. Check your connection and retry with the same action."; return error.response.data?.message || fallback; }
