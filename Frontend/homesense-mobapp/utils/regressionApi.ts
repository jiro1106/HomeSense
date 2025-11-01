// regressionApi.ts
import axios from "axios";

// localhost: http://192.168.100.98:5000
// deployed : https://homesense-regression.onrender.com

const REGRESSION_BASE_URL = "http://192.168.0.199:5000";

// Axios instance for the ML regression model
const regressionApi = axios.create({
  baseURL: REGRESSION_BASE_URL,
  timeout: 5000, // optional
});

export default regressionApi;
