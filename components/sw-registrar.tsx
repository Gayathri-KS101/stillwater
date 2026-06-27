"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    // Register the service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("SW registered:", reg.scope);
        })
        .catch((err) => {
          console.warn("SW registration failed:", err);
        });
    }

    // Listen for the beforeinstallprompt event
    // This fires when Chrome determines the app is installable.
    // If we don't prevent default + stash it, Chrome may silently suppress it.
    const handleInstallPrompt = (e: Event) => {
      console.log("beforeinstallprompt fired — PWA is installable!");
      // Don't prevent default — let the browser show its native install mini-infobar
      // If you wanted a custom install button, you'd call e.preventDefault() here
      // and stash the event for later use.
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
    };
  }, []);

  return null;
}
