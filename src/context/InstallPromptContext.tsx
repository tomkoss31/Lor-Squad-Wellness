import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface InstallPromptContextValue {
  canPromptInstall: boolean;
  isIos: boolean;
  isStandalone: boolean;
  promptInstall: () => Promise<boolean>;
}

const InstallPromptContext = createContext<InstallPromptContextValue | undefined>(undefined);

function detectIos() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const platform = navigator.userAgent.toLowerCase();
  const touchMac =
    navigator.platform === "MacIntel" && typeof navigator.maxTouchPoints === "number"
      ? navigator.maxTouchPoints > 1
      : false;

  return /iphone|ipad|ipod/.test(platform) || touchMac;
}

function detectStandalone() {
  if (typeof window === "undefined") {
    return false;
  }

  const iosStandalone =
    "standalone" in navigator ? Boolean((navigator as Navigator & { standalone?: boolean }).standalone) : false;

  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone;
}

export function InstallPromptProvider({ children }: PropsWithChildren) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const isIos = detectIos();

  useEffect(() => {
    setIsStandalone(detectStandalone());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleDisplayModeChange = () => setIsStandalone(detectStandalone());

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    mediaQuery.addEventListener("change", handleDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      mediaQuery.removeEventListener("change", handleDisplayModeChange);
    };
  }, []);

  async function promptInstall() {
    if (!deferredPrompt) {
      return false;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
      setIsStandalone(true);
      return true;
    }

    return false;
  }

  const value = useMemo(
    () => ({
      canPromptInstall: Boolean(deferredPrompt) && !isStandalone,
      isIos,
      isStandalone,
      promptInstall
    }),
    [deferredPrompt, isIos, isStandalone]
  );

  return <InstallPromptContext.Provider value={value}>{children}</InstallPromptContext.Provider>;
}

export function useInstallPrompt() {
  const context = useContext(InstallPromptContext);
  if (!context) {
    throw new Error("useInstallPrompt must be used inside InstallPromptProvider");
  }

  return context;
}
