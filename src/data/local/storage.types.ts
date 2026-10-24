export interface KeyValueStorage {
  get(key: string): Promise<string | null>;
  commit(values: Record<string, string>, removals?: string[]): Promise<void>;
}
