"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Download, Smartphone, X } from "lucide-react";

const LAST_PROMPT_AT = "rmw-install-reminder-last-shown-at";
const INSTALLED = "rmw-installed-on-device";
const REMIND_AFTER_MS = 3 * 24 * 60 * 60 * 1000;

type InstallChoice = "accepted" | "dismissed";
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: InstallChoice }>;
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || window.matchMedia("(display-mode: fullscreen)").matches
    || ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

function isAppleMobile() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export default function InstallAppPrompt() {
  const pathname = usePathname();
  const promptEvent = useRef<InstallPromptEvent | null>(null);
  const [canPrompt, setCanPrompt] = useState(false);
  const [appleMobile, setAppleMobile] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    setAppleMobile(isAppleMobile());
    if (isStandalone() || localStorage.getItem(INSTALLED) === "true") return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      promptEvent.current = event as InstallPromptEvent;
      setCanPrompt(true);
    };
    const onInstalled = () => {
      localStorage.setItem(INSTALLED, "true");
      promptEvent.current = null;
      setCanPrompt(false);
      setVisible(false);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!pathname?.startsWith("/ride") || (!canPrompt && !appleMobile) || isStandalone() || localStorage.getItem(INSTALLED) === "true") {
      setVisible(false);
      return;
    }
    const lastPrompt = Number(localStorage.getItem(LAST_PROMPT_AT) ?? 0);
    if (Date.now() - lastPrompt >= REMIND_AFTER_MS) {
      localStorage.setItem(LAST_PROMPT_AT, String(Date.now()));
      setVisible(true);
    }
  }, [pathname, canPrompt, appleMobile]);

  const dismiss = () => {
    setVisible(false);
    setShowInstructions(false);
  };

  const confirmInstalled = () => {
    localStorage.setItem(INSTALLED, "true");
    setVisible(false);
    setShowInstructions(false);
  };

  const install = async () => {
    const event = promptEvent.current;
    if (!event) {
      setShowInstructions(true);
      return;
    }
    await event.prompt();
    const choice = await event.userChoice;
    promptEvent.current = null;
    setCanPrompt(false);
    if (choice.outcome === "accepted") {
      localStorage.setItem(INSTALLED, "true");
      setVisible(false);
      return;
    }
    dismiss();
  };

  if (!visible) return null;

  return <aside className="install-app-prompt" aria-label="Install RideMyWork">
    <span className="install-app-icon"><Smartphone size={19}/></span>
    <div className="install-app-copy">
      <strong>{showInstructions ? "Add RideMyWork to your home screen" : "Keep RideMyWork close"}</strong>
      <p>{showInstructions
        ? appleMobile ? "In Safari, tap Share, then choose Add to Home Screen." : "Open your browser menu and choose Install app or Add to Home screen."
        : "Add the app icon to your home screen for quicker access."}</p>
    </div>
    {showInstructions ? <button className="install-app-action install-app-secondary" onClick={confirmInstalled}>I’ve added it</button> : <button className="install-app-action" onClick={() => void install()}><Download size={15}/>{appleMobile ? "How to add" : "Add app"}</button>}
    <button className="install-app-close" onClick={dismiss} aria-label="Not now"><X size={16}/></button>
  </aside>;
}
