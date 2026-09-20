import axios from "axios";

const api=axios.create({
    baseURL: (import.meta.env.VITE_SERVER_URL || "http://localhost:5000").replace(/\/+$/, ""),
    withCredentials:true
})

export default api

