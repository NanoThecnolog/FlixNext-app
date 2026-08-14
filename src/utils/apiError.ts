import axios from "axios";

export function apiErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return fallback;

  const data = error.response?.data;
  if (data && typeof data === "object" && "message" in data) {
    const message = data.message;

    if (typeof message === "string" && message.trim()) return message;
  }

  return fallback;
}
