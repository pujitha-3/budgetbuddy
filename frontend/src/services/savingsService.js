import api from "./api";

export const listSavingsGoals = () => api.get("/savings/");
export const createSavingsGoal = (payload) => api.post("/savings/", payload);
export const updateSavingsGoal = (id, payload) => api.put(`/savings/${id}`, payload);
export const deleteSavingsGoal = (id) => api.delete(`/savings/${id}`);
export const addSavingsContribution = (id, payload) => api.post(`/savings/${id}/contributions`, payload);
export const savingsTrend = (start_date, end_date) => api.get("/savings/contributions/trend", { params: { start_date, end_date } });
