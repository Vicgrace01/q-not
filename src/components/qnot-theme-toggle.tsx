"use client";

import { useEffect, useSyncExternalStore } from "react";

type ThemeChoice = "system" | "light" | "dark";
const STORAGE_KEY = "qnot-theme";
const THEME_EVENT = "qnot-theme-choice-change";
const ORDER: ThemeChoice[] = ["system", "light", "dark"];
let volatileChoice: ThemeChoice | null = null;

function isThemeChoice(value: string | null): value is ThemeChoice {
  return value === "system" || value === "light" || value === "dark";
}

function getChoice(): ThemeChoice {
  if (typeof window === "undefined") return "system";
  if (volatileChoice !== null) return volatileChoice;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isThemeChoice(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

function getServerChoice(): ThemeChoice {
  return "system";
}

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(THEME_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(THEME_EVENT, onStoreChange);
  };
}

function resolveTheme(choice: ThemeChoice, prefersLight: boolean): "light" | "dark" {
  return choice === "system" ? (prefersLight ? "light" : "dark") : choice;
}

function saveChoice(choice: ThemeChoice): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
    volatileChoice = null;
  } catch {
    volatileChoice = choice;
  }

  window.dispatchEvent(new Event(THEME_EVENT));
}

export function QNotThemeToggle() {
  const choice = useSyncExternalStore(subscribe, getChoice, getServerChoice);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");

    const applyTheme = () => {
      document.documentElement.dataset.theme = resolveTheme(getChoice(), media.matches);
    };

    const handleSystemChange = () => {
      if (getChoice() === "system") applyTheme();
    };

    applyTheme();
    media.addEventListener("change", handleSystemChange);
    window.addEventListener(THEME_EVENT, applyTheme);

    return () => {
      media.removeEventListener("change", handleSystemChange);
      window.removeEventListener(THEME_EVENT, applyTheme);
    };
  }, []);

  function cycleTheme() {
    const currentIndex = ORDER.indexOf(choice);
    const next = ORDER[(currentIndex + 1) % ORDER.length];
    saveChoice(next);
  }

  const icon = choice === "light" ? "\u2600" : choice === "dark" ? "\u263E" : "\u25D0";

  return (
    <button
      className="q-home-theme-toggle"
      type="button"
      onClick={cycleTheme}
      aria-label={`Appearance set to ${choice}. Activate to switch appearance.`}
      title={`Appearance: ${choice} (click to change)`}
    >
      <span aria-hidden="true">{icon}</span>
      <span className="q-home-theme-toggle-label">{choice}</span>
    </button>
  );
}
