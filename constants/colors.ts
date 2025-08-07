export const COLORS = {
  primary: "#E8A5C8", // Soft pink inspired by screenshots
  primaryDark: "#D48BB8", // Darker pink
  secondary: "#C8A5E8", // Soft purple
  secondaryDark: "#B88BD4", // Darker purple
  accent: "#FFD4E8", // Light pink accent
  background: "#F8F4F9", // Very light pink background
  card: "#FFFFFF", // Pure white cards
  text: "#2D2D2D",
  textLight: "#8E8E93",
  textDark: "#1C1C1E",
  border: "#F2F2F7",
  success: "#34C759",
  error: "#FF3B30",
  warning: "#FF9500",
  info: "#007AFF",
  gold: "#FFD700",
  white: "#FFFFFF",
  black: "#000000",
  transparent: "transparent",
  overlay: "rgba(0, 0, 0, 0.4)",
};

export const GRADIENTS = {
  primary: ["#E8A5C8", "#F4C2D7"] as const,
  secondary: ["#C8A5E8", "#D7C2F4"] as const,
  accent: ["#FFD4E8", "#FFE8F2"] as const,
  card: ["#FFFFFF", "#F8F4F9"] as const,
};

export default {
  light: {
    text: COLORS.text,
    background: COLORS.background,
    tint: COLORS.primary,
    tabIconDefault: "#ccc",
    tabIconSelected: COLORS.primary,
  },
  // Add all colors for easy access
  ...COLORS,
};