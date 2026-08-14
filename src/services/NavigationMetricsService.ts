class NavigationMetricsService {
  private details:
    | {
        key: string;
        pressedAt: number;
        navigatedAt?: number;
        mountedAt?: number;
      }
    | undefined;

  beginDetails(key: string) {
    this.details = { key, pressedAt: performance.now() };
  }

  markNavigate(key: string) {
    if (this.details?.key !== key) return;
    this.details.navigatedAt = performance.now();
    if (__DEV__) {
      console.log(
        `[FlixNext:Navigation] Details ${key} | toque→navigate=${Math.round(this.details.navigatedAt - this.details.pressedAt)}ms`,
      );
    }
  }

  markMounted(key: string) {
    if (this.details?.key !== key) return;
    this.details.mountedAt = performance.now();
    if (__DEV__ && this.details.navigatedAt !== undefined) {
      console.log(
        `[FlixNext:Navigation] Details ${key} | navigate→mount=${Math.round(this.details.mountedAt - this.details.navigatedAt)}ms`,
      );
    }
  }

  markTransitionEnd(key: string) {
    if (this.details?.key !== key) return;
    const endedAt = performance.now();
    if (__DEV__) {
      const mountedAt = this.details.mountedAt ?? endedAt;
      console.log(
        `[FlixNext:Navigation] Details ${key} ✓ mount→transição=${Math.round(endedAt - mountedAt)}ms | total=${Math.round(endedAt - this.details.pressedAt)}ms`,
      );
    }
    this.details = undefined;
  }
}

export const navigationMetricsService = new NavigationMetricsService();
