import api from "./api";
export const getReport = (start, end) => api.get("/reports/summary", { params: { start, end } });
