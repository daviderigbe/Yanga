import { api, queryString } from "./api";

type Params = Record<string, unknown>;
type Json = Record<string, unknown>;

const json = (body: unknown) => JSON.stringify(body);

export const authApi = {
  me: () => api("/api/auth/me"),
  signin: (body: { email: string; password: string }) =>
    api("/api/auth/signin", { method: "POST", body: json(body) }),
  signup: (body: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    username: string;
  }) => api("/api/auth/signup", { method: "POST", body: json(body) }),
  signout: () => api("/api/auth/signout", { method: "POST", body: json({}) }),
  oauthUrl: (provider: "google" | "apple", next?: string) =>
    `/api/auth/${provider}${queryString({ next })}`,
  mobileOauth: (provider: "google" | "apple", body: { idToken: string; accessToken?: string }) =>
    api(`/api/auth/mobile/${provider}`, { method: "POST", body: json(body) }),
  sendEmailCode: (email: string) =>
    api("/api/auth/email-verification/send-code", { method: "POST", body: json({ email }) }),
  verifyEmail: (body: { email: string; code: string }) =>
    api("/api/auth/email-verification/verify", { method: "POST", body: json(body) }),
  resendEmailCode: (email: string) =>
    api("/api/auth/email-verification/resend-code", { method: "POST", body: json({ email }) }),
  requestPasswordReset: (email: string) =>
    api("/api/auth/password/request-reset", { method: "POST", body: json({ email }) }),
  verifyResetCode: (body: { email: string; code: string }) =>
    api("/api/auth/password/verify-code", { method: "POST", body: json(body) }),
  resetPassword: (body: { email: string; code: string; newPassword: string }) =>
    api("/api/auth/password/reset", { method: "POST", body: json(body) }),
  refreshWsToken: () => api("/api/auth/refresh-ws-token"),
};

export const productApi = {
  list: (params?: Params) => api(`/api/products${queryString(params)}`),
  get: (id: string) => api(`/api/products/${id}`),
  create: (body: FormData | Json) =>
    api("/api/products/create", {
      method: "POST",
      body: body instanceof FormData ? body : json(body),
    }),
  update: (id: string, body: Json) =>
    api(`/api/products/${id}`, { method: "PATCH", body: json(body) }),
  delete: (id: string) => api(`/api/products/${id}`, { method: "DELETE" }),
  trending: (params?: Params) => api(`/api/products/trending${queryString(params)}`),
  newest: (params?: Params) => api(`/api/products/newest${queryString(params)}`),
  onSale: (params?: Params) => api(`/api/products/on-sale${queryString(params)}`),
  recommended: (params?: Params) => api(`/api/products/recommended${queryString(params)}`),
  mostLiked: (params?: Params) => api(`/api/products/most-liked${queryString(params)}`),
  bestSelling: (params?: Params) => api(`/api/products/best-selling${queryString(params)}`),
  followed: (params?: Params) => api(`/api/products/followed${queryString(params)}`),
  byCategory: (id: string, params?: Params) =>
    api(`/api/products/category/${id}${queryString(params)}`),
  byTag: (id: string, params?: Params) => api(`/api/products/tag/${id}${queryString(params)}`),
  like: (id: string) => api(`/api/products/${id}/like`, { method: "POST" }),
  unlike: (id: string) => api(`/api/products/${id}/like`, { method: "DELETE" }),
  addImage: (id: string, body: Json) =>
    api(`/api/products/${id}/images`, { method: "POST", body: json(body) }),
  reorderImages: (id: string, body: Json) =>
    api(`/api/products/${id}/images/reorder`, { method: "PUT", body: json(body) }),
  removeImage: (id: string, imageId: string) =>
    api(`/api/products/${id}/images/${imageId}`, { method: "DELETE" }),
  review: (id: string, body: Json) =>
    api(`/api/products/${id}/reviews`, { method: "POST", body: json(body) }),
};

export const userApi = {
  get: (id: string) => api(`/api/users/${id}`),
  products: (id: string, params?: Params) => api(`/api/users/${id}/products${queryString(params)}`),
  likes: (id: string, params?: Params) => api(`/api/users/${id}/likes${queryString(params)}`),
  soldProducts: (id: string, params?: Params) =>
    api(`/api/users/${id}/sold-products${queryString(params)}`),
  reviews: (id: string, params?: Params) => api(`/api/users/${id}/reviews${queryString(params)}`),
  follow: (id: string) => api(`/api/users/${id}/follow`, { method: "POST" }),
  unfollow: (id: string) => api(`/api/users/${id}/follow`, { method: "DELETE" }),
  editProfile: (id: string, body: FormData | Json) =>
    api(`/api/users/${id}/edit-profile`, {
      method: "POST",
      body: body instanceof FormData ? body : json(body),
    }),
  changePassword: (id: string, body: Json) =>
    api(`/api/users/${id}/change-password`, { method: "POST", body: json(body) }),
  deactivate: (id: string) => api(`/api/users/${id}/deactivate`, { method: "PUT" }),
  reactivate: (id: string) => api(`/api/users/${id}/reactivate`, { method: "PUT" }),
  toggleBundleBuying: (id: string) =>
    api(`/api/users/${id}/toggle-bundle-buying`, { method: "PUT" }),
  toggleUnavailability: (id: string) =>
    api(`/api/users/${id}/toggle-unavailability`, { method: "PUT" }),
  bankDetails: () => api("/api/users/bank-details"),
  saveBankDetails: (body: Json) =>
    api("/api/users/bank-details", { method: "POST", body: json(body) }),
};

export const cartApi = {
  get: () => api("/api/cart"),
  add: (body: { productId: string; quantity: number }) =>
    api("/api/cart", { method: "POST", body: json(body) }),
  updateItem: (itemId: string, body: Json) =>
    api(`/api/cart/items/${itemId}`, { method: "PUT", body: json(body) }),
  removeItem: (itemId: string) => api(`/api/cart/items/${itemId}`, { method: "DELETE" }),
  clear: () => api("/api/cart", { method: "DELETE" }),
};

export const addressApi = {
  list: (params?: Params) => api(`/api/address${queryString(params)}`),
  create: (body: Json) => api("/api/address", { method: "POST", body: json(body) }),
  update: (id: string, body: Json) =>
    api(`/api/address/${id}`, { method: "PATCH", body: json(body) }),
  delete: (id: string) => api(`/api/address/${id}`, { method: "DELETE" }),
  states: () => api("/api/address/states"),
};

export const catalogApi = {
  categories: () => api("/api/categories"),
  tags: () => api("/api/tags"),
  vendors: (params?: Params) => api(`/api/vendors/vendors${queryString(params)}`),
  topVendors: (params?: Params) => api(`/api/vendors/top${queryString(params)}`),
  search: (params?: Params) => api(`/api/search${queryString(params)}`),
};

export const messageApi = {
  conversations: () => api("/api/conversations"),
  conversation: (userId: string, params?: Params) =>
    api(`/api/conversations/${userId}${queryString(params)}`),
  send: (body: Json) => api("/api/messages", { method: "POST", body: json(body) }),
  markRead: (userId: string) => api(`/api/conversations/${userId}/read`, { method: "PUT" }),
  unreadCount: () => api("/api/messages/unread/count"),
};

export const brandApi = {
  verified: (params?: Params) => api(`/api/brands/brands/verified${queryString(params)}`),
  mine: (params?: Params) => api(`/api/brands/brands/my-brands${queryString(params)}`),
  get: (id: string) => api(`/api/brands/brands/${id}`),
  registerDraft: (body: Json) =>
    api("/api/brands/brands/register-draft", { method: "POST", body: json(body) }),
  update: (id: string, body: Json) =>
    api(`/api/brands/brands/${id}`, { method: "PUT", body: json(body) }),
  delete: (id: string) => api(`/api/brands/brands/${id}`, { method: "DELETE" }),
  submitVerification: (id: string) =>
    api(`/api/brands/brands/${id}/submit-verification`, { method: "POST" }),
};

export const paymentApi = {
  cards: () => api("/api/payment/cards"),
  saveCard: (body: Json) => api("/api/payment/cards", { method: "POST", body: json(body) }),
  defaultCard: (id: string) => api(`/api/payment/cards/${id}/default`, { method: "PATCH" }),
  deleteCard: (id: string) => api(`/api/payment/cards/${id}`, { method: "DELETE" }),
  createOrder: (body: Json) =>
    api("/api/payment/orders/create", { method: "POST", body: json(body) }),
  verifyOrder: (body: Json) =>
    api("/api/payment/orders/verify-payment", { method: "POST", body: json(body) }),
  order: (orderId: string) => api(`/api/payment/orders/${orderId}`),
  walletBalance: (userId: string) => api(`/api/payment/wallet/${userId}/balance`),
  withdrawalHistory: (userId: string, params?: Params) =>
    api(`/api/payment/wallet/${userId}/withdrawals${queryString(params)}`),
  withdraw: (body: Json) =>
    api("/api/payment/wallet/withdraw", { method: "POST", body: json(body) }),
  withdrawSaved: (body: Json) =>
    api("/api/payment/wallet/withdraw-saved", { method: "POST", body: json(body) }),
  banks: () => api("/api/payment/banks"),
  resolveBank: (body: { accountNumber: string; bankCode?: string; bankName?: string }) =>
    api("/api/payment/banks/resolve", { method: "POST", body: json(body) }),
};

export const dispatchApi = {
  quote: (body: { addressId: string; itemCount: number; serviceLevel?: string }) =>
    api("/api/dispatch/quote", { method: "POST", body: json(body) }),
  create: (orderId: string) => api(`/api/dispatch/orders/${orderId}/create`, { method: "POST" }),
  sync: (orderId: string) => api(`/api/dispatch/orders/${orderId}/sync`, { method: "POST" }),
  cancel: (orderId: string) => api(`/api/dispatch/orders/${orderId}/cancel`, { method: "POST" }),
  shipment: (orderId: string) => api(`/api/dispatch/orders/${orderId}/shipment`),
  updateShipmentStatus: (shipmentId: string, body: { status: string; message?: string }) =>
    api(`/api/dispatch/shipments/${shipmentId}/status`, { method: "PATCH", body: json(body) }),
};

export const historyApi = {
  sales: (params?: Params) => api(`/api/sales${queryString(params)}`),
  purchases: (params?: Params) => api(`/api/purchases${queryString(params)}`),
};

export const uploadApi = {
  single: (body: FormData) => api("/api/upload/single", { method: "POST", body }),
  multiple: (body: FormData) => api("/api/upload/multiple", { method: "POST", body }),
  presignedUrl: (body: Json) =>
    api("/api/upload/presigned-url", { method: "POST", body: json(body) }),
  delete: (body: { url?: string; key?: string }) =>
    api("/api/upload/delete", { method: "DELETE", body: json(body) }),
};

export const realtimeApi = {
  wsToken: () => api("/api/ws-token"),
};
