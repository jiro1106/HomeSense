// api.ts
import axios from "axios";

// Put your backend IP here
const BASE_URL = "https://homesense-dgdp.onrender.com/";

// Create an Axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 5000, // optional: timeout in ms
});

export default api;
