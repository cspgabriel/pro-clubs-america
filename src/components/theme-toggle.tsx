"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "dark" | "light";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem("clubs-brasil-theme") as Theme | null) ?? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  });

  useEffect(() => {
    // React may reconcile the server-rendered <html> attributes after the
    // inline bootstrap script runs. Re-apply the persisted choice once the
    // client is mounted so the visual theme and toggle label cannot diverge.
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("clubs-brasil-theme", next);
  }

  return <button suppressHydrationWarning className="theme-toggle" type="button" onClick={toggle} aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"} title={theme === "dark" ? "Tema claro" : "Tema escuro"}>{theme === "dark" ? <Sun /> : <Moon />}</button>;
}
