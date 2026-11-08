/** Shared 3D -> 2D fallback: WebGL detection, an error boundary that logs, and a visible "why" chip. */
import { Component, type ErrorInfo, type ReactNode } from 'react';

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export const NO_WEBGL = 'WebGL not available in this browser';
export const CRASHED = '3D scene crashed (see console)';

/** Renders `fallback` if the 3D subtree throws, logs the error, and reports it once through `onError`. */
export class ThreeBoundary extends Component<{ fallback: ReactNode; children: ReactNode; onError?: (reason: string) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('[world] 3D view failed, showing the 2D fallback:', error, info.componentStack);
    this.props.onError?.(CRASHED);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Small visible chip explaining why 3D is off, with a retry button. */
export function FallbackChip({ reason, onRetry }: { reason: string; onRetry?: () => void }) {
  return (
    <div className="w-fallback-chip" role="status">
      <span>3D off: {reason}</span>
      {onRetry && reason !== NO_WEBGL && <button onClick={onRetry}>Try 3D again</button>}
    </div>
  );
}
