import { backendClient } from "../api/httpClients";
import { DeviceVerificationRequired, LoginSuccess, User } from "../domain/user";
import { sessionStorage } from "../storage/sessionStorage";

type LoginResponse = LoginSuccess | DeviceVerificationRequired;

class AuthService {
  async login(email: string, password: string, replaceDeviceId?: string) {
    const deviceToken = await sessionStorage.getDeviceToken();
    const { data } = await backendClient.post<LoginResponse>("/login", {
      email,
      password,
      replaceDeviceId,
      deviceToken,
    });
    if (!("verificationRequired" in data)) {
      await sessionStorage.save(data.token, data.deviceToken);
    }
    return data;
  }

  async verifyDevice(challengeId: string, code: string) {
    const { data } = await backendClient.post<LoginSuccess>(
      "/login/device/verify",
      { challengeId, code },
    );
    await sessionStorage.save(data.token, data.deviceToken);
    return data;
  }

  async resendDevice(challengeId: string) {
    const { data } = await backendClient.post<{ resendAfterSeconds: number }>(
      "/login/device/resend",
      { challengeId },
    );
    return data;
  }

  async currentUser() {
    const { data } = await backendClient.get<User>("/user");
    return data;
  }

  async logout() {
    try {
      await backendClient.post("/logout");
    } finally {
      await sessionStorage.clear();
    }
  }

  hasSession() {
    return sessionStorage.getToken().then(Boolean);
  }
}

export const authService = new AuthService();
