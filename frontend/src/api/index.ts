import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:9000",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Important for sending cookies
});

// Add response interceptor to handle unauthorized responses
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Redirect to login on unauthorized
      window.location.href = "/auth/signin";
    }
    return Promise.reject(error);
  }
);