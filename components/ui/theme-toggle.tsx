"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useT } from "@/lib/i18n";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const t = useT();

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("cu-theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <button
      onClick={toggle}
      className="rounded p-1 text-cu-text-tertiary hover:bg-cu-hover-strong hover:text-cu-text"
      title={dark ? t("theme.light") : t("theme.dark")}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
