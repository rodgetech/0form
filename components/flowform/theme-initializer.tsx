"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

type ThemeInitializerProps = {
  theme?: string;
};

export function ThemeInitializer({ theme }: ThemeInitializerProps) {
  const { setTheme } = useTheme();

  useEffect(() => {
    if (theme === "light" || theme === "dark") {
      setTheme(theme);
    }
  }, [theme, setTheme]);

  return null;
}
