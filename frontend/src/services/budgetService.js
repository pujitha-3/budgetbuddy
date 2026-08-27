import api from "./api";
export const getBudgets=()=>api.get("/budget/");
export const addBudget=data=>api.post("/budget/",data);
export const updateBudget=(id,data)=>api.put(`/budget/${id}`,data);
export const deleteBudget=id=>api.delete(`/budget/${id}`);
