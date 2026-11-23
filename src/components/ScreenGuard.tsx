// Keeps one broken or unloadable screen from blanking the whole app.
import { Component, lazy, type ComponentType, type ReactNode } from 'react';

function LoadError({ offline }: { offline: boolean }) {
  return (
    <div className="mx-auto max-w-xl space-y-4 border-t border-ink-600 pt-6">
      <h1 className="text-[22px] font-semibold text-white">{offline ? 'This screen needs a connection' : "This screen didn't load"}</h1>
      <p className="text-sm text-slate-400">
        {offline ? 'It has not been opened on this device yet. Reconnect and try again; screens you already opened keep working offline.' : 'Something went wrong while opening it. Your paper account and settings are safe.'}
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={() => window.location.reload()} className="min-h-[48px] rounded-full bg-white px-5 text-sm font-semibold text-ink-900">Try again</button>
        <a href={import.meta.env.BASE_URL} className="inline-flex min-h-[48px] items-center rounded-full border border-ink-500 px-5 text-sm text-white">Go to Home</a>
      </div>
    </div>
  );
}

/** lazy() that retries once, then shows a readable error instead of throwing (e.g. offline before first visit). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyScreen<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      return await factory();
    } catch {
      await new Promise((r) => setTimeout(r, 800));
      try {
        return await factory();
      } catch {
        const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
        return { default: (() => <LoadError offline={offline} />) as unknown as T };
      }
    }
  });
}

/** Catches render errors in one screen. Resets when the route changes (key). */
export class ScreenBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error('Screen error', error);
  }
  render() {
    return this.state.failed ? <LoadError offline={false} /> : this.props.children;
  }
}

/** Fetch the usual screens in the background so they also open offline later. */
export function prefetchScreens(loaders: (() => Promise<unknown>)[]) {
  const run = () => loaders.forEach((l) => void l().catch(() => undefined));
  const w = window as Window & { requestIdleCallback?: (cb: () => void) => void };
  if (w.requestIdleCallback) w.requestIdleCallback(run);
  else setTimeout(run, 2500);
}
