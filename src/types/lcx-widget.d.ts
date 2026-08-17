// Type shim for the LCX KYC widget JS bundle.
//
// Loaded at runtime from `${widget_base_url}/kyc-widget.js` (the bundle
// attaches `KYCWidget` to `window`). We model only the subset of the API
// we actually call from kyc-flow.tsx.

export {};

export interface KYCWidgetInitOptions {
  /** DOM element ID the widget mounts into. Must exist before init(). */
  containerId: string;
  /** Short-lived JWT from POST /api/v1/session/create. */
  sessionToken: string;
  /** REST API root the widget calls back into, e.g. `${widget_base_url}/api/v1`. */
  apiUrl: string;
  /** Theme; default 'light'. */
  theme?: "light" | "dark" | "minimal" | "corporate";
  /** Locale code, default 'en'. */
  locale?: string;
  /** All KYC steps completed by the user. */
  onComplete?: (result: { status: string; applicantId?: string }) => void;
  /** Widget-side error (session expired, upload failed, etc.). */
  onError?: (error: { code: string; message: string }) => void;
  /** Fired as the user moves between widget steps. */
  onStepChange?: (data: { step: string; stepIndex?: number }) => void;
}

export interface KYCWidgetInstance {
  on(event: string, cb: (data: unknown) => void): void;
  open(): void;
  close(): void;
  destroy(): void;
}

declare global {
  interface Window {
    KYCWidget?: {
      init(options: KYCWidgetInitOptions): KYCWidgetInstance;
    };
  }
}
