import "server-only";

export class TTLCache<K, V> {
  private readonly map = new Map<K, { value: V; expiresAt: number; lastAccess: number }>();
  private accessSequence = 0;

  constructor(
    private readonly ttlMs: number,
    private readonly maxSize: number,
    private readonly clock: () => number = () => Date.now()
  ) {}

  get(key: K): V | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;

    if (entry.expiresAt <= this.clock()) {
      this.map.delete(key);
      return undefined;
    }

    entry.lastAccess = ++this.accessSequence;
    return entry.value;
  }

  set(key: K, value: V): void {
    const now = this.clock();
    this.map.set(key, { value, expiresAt: now + this.ttlMs, lastAccess: ++this.accessSequence });
    this.pruneExpired(now);
    this.ensureCapacity();
  }

  has(key: K): boolean {
    const v = this.get(key);
    return v !== undefined;
  }

  delete(key: K): boolean {
    return this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  private pruneExpired(now: number): void {
    for (const [key, entry] of this.map.entries()) {
      if (entry.expiresAt <= now) {
        this.map.delete(key);
      }
    }
  }

  private ensureCapacity(): void {
    if (this.map.size <= this.maxSize) return;

    let oldestKey: K | undefined;
    let oldestAccess = Number.POSITIVE_INFINITY;

    for (const [key, entry] of this.map.entries()) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey !== undefined) {
      this.map.delete(oldestKey);
    }

    if (this.map.size > this.maxSize) {
      const iterator = this.map.keys();
      const first = iterator.next();
      if (!first.done) {
        this.map.delete(first.value);
      }
    }
  }
}
