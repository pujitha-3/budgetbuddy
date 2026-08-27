import api from "./api";

const auth = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

export const getBankAccounts = () => api.get("/bank-accounts/", auth());
export const addBankAccount = (data) => api.post("/bank-accounts/", data, auth());
export const updateBankAccount = (id, data) => api.put(`/bank-accounts/${id}`, data, auth());
export const deleteBankAccount = (id) => api.delete(`/bank-accounts/${id}`, auth());
