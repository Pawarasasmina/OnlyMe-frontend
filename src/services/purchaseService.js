import api from"../api/axiosInstance";export const purchaseService={purchaseWorld:(publicationId,idempotencyKey)=>api.post(`/worlds/${publicationId}/purchase`,{idempotencyKey})};
