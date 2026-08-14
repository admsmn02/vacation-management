import { EventDispatcher } from "./event-dispatcher";

export class InMemoryEventDispatcher implements EventDispatcher {
  private listeners: Array<(event: unknown) => void | Promise<void>> = [];

  subscribe(listener: (event: unknown) => void | Promise<void>): void {
    this.listeners.push(listener);
  }

  async publish(event: unknown): Promise<void> {
    for (const listener of this.listeners) {
      await listener(event);
    }
  }
}
