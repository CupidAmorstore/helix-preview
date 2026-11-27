// Serialized read-modify-write store: each mutation sees the result of the previous one, and saves happen in
// the same order. Prevents lost updates when two orders (or an order and a valuation snapshot) overlap.
export type Mutation<S, T> = (state: S) => { next: S; result: T } | null;

export function createSerialStore<S>(initial: S, save: (s: S) => Promise<void>, onChange: (s: S) => void = () => undefined) {
  let state = initial;
  let tail: Promise<unknown> = Promise.resolve();
  return {
    get: () => state,
    /** set without saving (initial load from storage) */
    hydrate(s: S) { state = s; onChange(s); },
    mutate<T>(fn: Mutation<S, T>): Promise<T | undefined> {
      const run = tail.then(async () => {
        const out = fn(state);
        if (!out) return undefined;
        if (out.next !== state) {
          const prev = state;
          state = out.next;
          onChange(state);
          try {
            await save(state);
          } catch (e) {
            // never show a ledger state that is not on disk: roll back and report the failure
            state = prev;
            onChange(prev);
            throw e;
          }
        }
        return out.result;
      });
      tail = run.catch(() => undefined);
      return run;
    }
  };
}
