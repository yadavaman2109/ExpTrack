import axios from "axios";

const api = axios.create({ baseURL: "" });

api.interceptors.request.use(config => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    res => res,
    err => {
        if (err.response?.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "/";
        }
        return Promise.reject(err);
    }
);

export const register = (data) => api.post("/auth/register", data);
export const login = (data) => api.post("/auth/login", data);
export const getMe = () => api.get("/auth/me");

export const addExpense = (data) => api.post("/expenses/add", data);
export const getAllExpenses = (month) => api.get("/expenses/all", { params: { month } });
export const updateExpense = (id, d) => api.put(`/expenses/update/${id}`, d);
export const deleteExpense = (id) => api.delete(`/expenses/delete/${id}`);

export const addIncome = (data) => api.post("/income/add", data);
export const getAllIncome = (month) => api.get("/income/all", { params: { month } });
export const deleteIncome = (id) => api.delete(`/income/delete/${id}`);
export const getMonthlyIncome = () => api.get("/income/monthly");

export const getMonthlyAnalytics = () => api.get("/analytics/monthly");
export const getCategoryAnalytics = (month) => api.get("/analytics/category", { params: { month } });
export const getDailyAnalytics = (month) => api.get("/analytics/daily", { params: { month } });
export const getOverview = () => api.get("/analytics/overview");
export const getTopCategories = () => api.get("/analytics/top");

export const setBudget = (data) => api.post("/budget/set", data);
export const getBudgetStatus = (month) => api.get("/budget/status", { params: { month } });