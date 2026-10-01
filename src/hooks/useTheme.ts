import { useState, useEffect } from "react";

const THEME_STORAGE_KEY = "startspace.theme";
const ACCENT_STORAGE_KEY = "startspace.accent";
export type AccentName = "amber" | "blue" | "green" | "red" | "teal";
const ACCENTS: AccentName[] = ["amber", "blue", "green", "red", "teal"];

interface ThemeState {
  theme: "light" | "dark";
  accent: AccentName;
  mounted: boolean;
}

export function useTheme() {
  const [state, setState] = useState<ThemeState>({
    theme: "light",
    accent: "amber",
    mounted: false,
  });

  useEffect(() => {
    const sync = () => {
      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      const systemDefault = window.matchMedia?.("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      const theme =
        storedTheme === "light" || storedTheme === "dark"
          ? storedTheme
          : systemDefault;
      const storedAccent = localStorage.getItem(
        ACCENT_STORAGE_KEY,
      ) as AccentName | null;
      const accent =
        storedAccent && ACCENTS.includes(storedAccent) ? storedAccent : "amber";
      setState((current) =>
        current.mounted && current.theme === theme && current.accent === accent
          ? current
          : { theme, accent, mounted: true },
      );
    };
    sync();
    window.addEventListener("startspace:theme-changed", sync);
    return () => window.removeEventListener("startspace:theme-changed", sync);
  }, []);

  useEffect(() => {
    if (state.mounted) {
      const changed =
        document.documentElement.dataset.theme !== state.theme ||
        document.documentElement.dataset.accent !== state.accent;
      document.documentElement.setAttribute("data-theme", state.theme);
      document.documentElement.setAttribute("data-accent", state.accent);
      localStorage.setItem(THEME_STORAGE_KEY, state.theme);
      localStorage.setItem(ACCENT_STORAGE_KEY, state.accent);
      if (changed) window.dispatchEvent(new Event("startspace:theme-changed"));
    }
  }, [state]);

  const toggle = () => {
    if (!state.mounted) return;
    setState((prev) => ({
      ...prev,
      theme: prev.theme === "light" ? "dark" : "light",
    }));
  };

  const setTheme = (theme: ThemeState["theme"]) =>
    setState((current) => ({ ...current, theme }));
  const setAccent = (accent: AccentName) =>
    setState((current) => ({ ...current, accent }));

  return { ...state, toggle, setTheme, setAccent };
}
