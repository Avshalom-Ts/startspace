import { useState, useEffect } from "react";

const THEME_STORAGE_KEY = "startspace.theme";

interface ThemeState {
  theme: "light" | "dark";
  mounted: boolean;
}

export function useTheme() {
  const [state, setState] = useState<ThemeState>({
    theme: "light",
    mounted: false,
  });

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    const isValid = stored === "light" || stored === "dark";
    const systemDefault = window.matchMedia
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : "dark";
    setState({ theme: isValid ? stored : systemDefault, mounted: true });
  }, []);

  useEffect(() => {
    if (state.mounted) {
      document.documentElement.setAttribute("data-theme", state.theme);
      localStorage.setItem(THEME_STORAGE_KEY, state.theme);
    }
  }, [state.theme, state.mounted]);

  const toggle = () => {
    if (!state.mounted) return;
    setState((prev) => ({
      ...prev,
      theme: prev.theme === "light" ? "dark" : "light",
    }));
  };

  return { ...state, toggle };
}
