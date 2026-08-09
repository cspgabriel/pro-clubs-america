"use client";

import { Moon, Sun } from "lucide-react";
import { useState } from "react";

type Theme = "dark" | "light";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem("clubs-brasil-theme") as Theme | null) ?? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  });

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("clubs-brasil-theme", next);
  }

  return <button suppressHydrationWarning className="theme-toggle" type="button" onClick={toggle} aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"} title={theme === "dark" ? "Tema claro" : "Tema escuro"}>{theme === "dark" ? <Sun /> : <Moon />}</button>;
}
