interface NavigationProgressState {
  active: boolean;
  revision: number;
}

type Listener = (state: NavigationProgressState) => void;

class NavigationProgressService {
  private state: NavigationProgressState = { active: false, revision: 0 };
  private listeners = new Set<Listener>();

  private emit() {
    this.listeners.forEach((listener) => listener(this.state));
  }

  start() {
    this.state = { active: true, revision: this.state.revision + 1 };
    this.emit();
    return this.state.revision;
  }

  complete() {
    if (!this.state.active) return;
    this.state = { ...this.state, active: false };
    this.emit();
  }

  run(action: () => void, completeAfterMs?: number) {
    const revision = this.start();
    action();
    if (completeAfterMs !== undefined) {
      setTimeout(() => {
        if (this.state.revision === revision) this.complete();
      }, completeAfterMs);
    }
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const navigationProgressService = new NavigationProgressService();
