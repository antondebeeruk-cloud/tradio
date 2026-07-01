import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "uk.tradio.app",
  appName: "Tradio",
  webDir: "mobile-shell",
  appendUserAgent: "TradioNative/0.20",
  backgroundColor: "#06233f",
  loggingBehavior: "none",
  server: {
    url: process.env.CAPACITOR_SERVER_URL || "https://tradio.uk",
    cleartext: false,
    allowNavigation: ["tradio.uk", "*.tradio.uk"],
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 3000,
      backgroundColor: "#06233fff",
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: "#06233f",
      style: "LIGHT",
    },
  },
};

export default config;
