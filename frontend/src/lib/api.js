import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

export function formatApiError(detail, fallbackMessage = "Something went wrong. Please try again.") {
  if (detail == null) return fallbackMessage;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export function formatRequestError(error) {
  if (!error?.response) {
    return "Unable to reach the backend. Check that the backend is running and allows this frontend URL.";
  }
  return formatApiError(error.response?.data?.detail);
}

export default api;
