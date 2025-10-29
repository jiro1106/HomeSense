// regressionApi.ts
import axios from "axios";

// Use your local network IP if testing on your phone (same Wi-Fi)
// Example: http://192.168.100.98:5000
// Later, replace this with your Render ML API URL
const REGRESSION_BASE_URL = "http://192.168.100.98:5000";

// Axios instance for the ML regression model
const regressionApi = axios.create({
  baseURL: REGRESSION_BASE_URL,
  timeout: 5000, // optional
});

export default regressionApi;
