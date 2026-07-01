"use client";

import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { useEffect } from "react";

export function NativeAppBridge() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    void SplashScreen.hide();
    void StatusBar.setStyle({ style: Style.Light });

    const listener = App.addListener("appUrlOpen", ({ url }) => {
      try {
        const incoming = new URL(url);
        const isTradioLink =
          incoming.protocol === "tradio:" ||
          incoming.hostname === "tradio.uk" ||
          incoming.hostname.endsWith(".tradio.uk");

        if (!isTradioLink) return;
        const destination = `${incoming.pathname}${incoming.search}${incoming.hash}` || "/";
        window.location.assign(destination);
      } catch {
        // Ignore malformed external links rather than navigating the app away.
      }
    });

    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, []);

  return null;
}
