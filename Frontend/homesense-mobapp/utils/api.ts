// api.ts
import axios from "axios";

// Put your backend IP here
const BASE_URL = "http://192.168.1.3:8000";

// Create an Axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 5000, // optional: timeout in ms
});

export default api;
