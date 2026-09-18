import axios, { AxiosError } from "axios";
import { appConfig } from "../config/appConfig";
import { sessionStorage } from "../storage/sessionStorage";

export const backendClient = axios.create({
  baseURL: appConfig.apiUrl,
  timeout: 15_000,
});

export const contentClient = axios.create({
  baseURL: appConfig.contentUrl,
  timeout: 30_000,
});

export const tmdbClient = axios.create({
  baseURL: appConfig.tmdbUrl,
  timeout: 30_000,
});

backendClient.interceptors.request.use(async (config) => {
  const token = await sessionStorage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

contentClient.interceptors.request.use(async (config) => {
  const token = await sessionStorage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

backendClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401 && (await sessionStorage.getToken())) {
      await sessionStorage.clear();
    }
    return Promise.reject(error);
  },
);
