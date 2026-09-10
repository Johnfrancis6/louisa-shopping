// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// ---------------------------------------------------------------------------
// Workaround — Next 16 hydration instrumentation + Firefox
// `next/dist/client/index.js` runs
//   performance.measure("Next.js-before-hydration", "navigationStart", "beforeRender")
// but never creates a "navigationStart" User Timing mark. Firefox then resolves
// the name to the legacy `PerformanceTiming.navigationStart` (an absolute epoch
// timestamp), so the measure's computed end is hugely negative and Firefox
// throws `Performance.measure: Given attribute end cannot be negative`
// (surfaced as an unhandled Runtime TypeError in the dev overlay).
// Creating our own mark pinned to timeOrigin makes `measure()` prefer it (User
// Timing marks win over PerformanceTiming attributes) and keeps the duration
// positive. Harmless in Chromium, where the legacy fallback already resolves to 0.
if (
  typeof performance !== "undefined" &&
  typeof performance.mark === "function"
) {
  try {
    if (!performance.getEntriesByName("navigationStart", "mark").length) {
      performance.mark("navigationStart", { startTime: 0 });
    }
  } catch {
    // Older engines may reject the `startTime` option — the error is cosmetic.
  }
}

Sentry.init({
  dsn: "https://298f39837a6649d175a766cc2f8b75e4@o4512038411370496.ingest.de.sentry.io/4512038430244944",

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
