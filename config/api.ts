import axios from "axios";

const RAW_API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080";
export const API_URL = RAW_API_URL;

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
