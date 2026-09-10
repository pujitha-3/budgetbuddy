import axios from "axios";

const api = axios.create({ baseURL: "http://127.0.0.1:8000" });

export const getToken = () => sessionStorage.getItem("token");
export const getRole = () => sessionStorage.getItem("role");

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("role");
      if (location.pathname !== "/") location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default api;
