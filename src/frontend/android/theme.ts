/**
 * TASARIM TOKEN'LARI + TEMA STORE'U (ANDROID)
 * --------------------------------------------------------------------------
 * Light/Dark renk paletleri, manuel override için zustand store ve sistem
 * temasıyla birleşip etkin renkleri döndüren `useThemeColors` hook'u burada.
 * Override store'u kalıcı değildir; uygulama her açıldığında 'system' moduyla
 * başlar.
 */
import { useColorScheme } from "react-native";
import { create } from "zustand";

export type ThemeColors = {
  background: string;
  surface: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primarySoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  sentBubble: string;
  receivedBubble: string;
  sentText: string;
  receivedText: string;
  inputBackground: string;
};

export const lightColors: ThemeColors = {
  background: "#F8FAFC",
  surface: "#FFFFFF",
  border: "#E2E8F0",
  textPrimary: "#1E293B",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
  primary: "#0284C7",
  primarySoft: "#E0F2FE",
  success: "#10B981",
  successSoft: "#DCFCE7",
  warning: "#F59E0B",
  warningSoft: "#FEF3C7",
  danger: "#EF4444",
  dangerSoft: "#FEE2E2",
  sentBubble: "#DCF8C6",
  receivedBubble: "#DDDDDD",
  sentText: "#000000",
  receivedText: "#000000",
  inputBackground: "#F5F5F5",
};

export const darkColors: ThemeColors = {
  background: "#0F172A",
  surface: "#1E293B",
  border: "#334155",
  textPrimary: "#F1F5F9",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  primary: "#38BDF8",
  primarySoft: "#0C4A6E",
  success: "#34D399",
  successSoft: "#064E3B",
  warning: "#FBBF24",
  warningSoft: "#78350F",
  danger: "#F87171",
  dangerSoft: "#7F1D1D",
  sentBubble: "#005C4B",
  receivedBubble: "#2A3942",
  sentText: "#E9EDEF",
  receivedText: "#E9EDEF",
  inputBackground: "#2A3942",
};

export type ThemeMode = "light" | "dark" | "system";

type ThemeStore = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

export const useThemeStore = create<ThemeStore>((set) => ({
  mode: "system",
  setMode: (mode) => set({ mode }),
}));

export function useThemeColors(): ThemeColors {
  const mode = useThemeStore((s) => s.mode);
  const systemScheme = useColorScheme();
  const effective = mode === "system" ? systemScheme ?? "light" : mode;
  return effective === "dark" ? darkColors : lightColors;
}

export function useEffectiveTheme(): "light" | "dark" {
  const mode = useThemeStore((s) => s.mode);
  const systemScheme = useColorScheme();
  return mode === "system" ? (systemScheme === "dark" ? "dark" : "light") : mode;
}
