export interface EventDispatcher {
  publish(event: unknown): Promise<void>;
}
