"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

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
