// src/theme/theme.ts
import {
  configureFonts,
  MD3LightTheme as DefaultTheme,
  useTheme,
} from "react-native-paper";
import type { MD3Theme } from "react-native-paper";

interface CustomThemeProperties {
  spacing: {
    x_small: number;
    small: number;
    medium: number;
    large: number;
  };
  padding: {
    x_small: number;
    small: number;
    large: number;
  };
}

export type AppTheme = MD3Theme & CustomThemeProperties;

const fontConfig = {
  fontFamily: "LeagueSpartan-Regular",
  fontWeight: "normal" as "normal",
  // The keys here (e.g. regular, medium) correspond to MD3 types.
  // We map our loaded font files to these types.
  regular: {
    fontFamily: "LeagueSpartan-Regular",
    fontWeight: "normal" as "normal",
  },
  // medium: {
  //   fontFamily: "LeagueSpartan-Medium",
  //   fontWeight: "normal" as "normal",
  // },
  semiBold: {
    fontFamily: "LeagueSpartan-SemiBold",
    fontWeight: "normal" as "normal",
  },
  bold: {
    fontFamily: "LeagueSpartan-Bold",
    fontWeight: "bold" as "bold",
  },
  // You can also specify fonts for specific variants like headlines, body, etc.
  // For a basic setup, the above is often enough as components inherit.
};

// Define your custom colors. You can find color palette generators online.
const customColors = {
  primary: "#FFA061",
  onPrimary: "#061A2C",
  primaryContainer: "#b5f2ff",
  onPrimaryContainer: "#001f23",

  secondary: "#829496", // A muted color for secondary elements
  onSecondary: "#ffffff",
  secondaryContainer: "#ddeef0",
  onSecondaryContainer: "#0a1f22",

  tertiary: "#938f99", // An accent color
  onTertiary: "#ffffff",
  tertiaryContainer: "#e9dff5",
  onTertiaryContainer: "#241c29",

  error: "#F67272",
  onError: "#ffffff",
  errorContainer: "#ffdad6",
  onErrorContainer: "#410002",

  background: "#061A2C",
  onBackground: "#FFF9F5",
  surface: "#224055",
  onSurface: "#FFF9F5",
  surfaceVariant: "#e0e2e3",
  onSurfaceVariant: "#C7C7C7",
  outline: "#667682",
  outlineVariant: "#224055",
  elevation: {
    level0: "transparent",
    level1: "#f4f7f8",
    level2: "#eff4f5",
    level3: "#e9f1f2",
    level4: "#e7eff0",
    level5: "#e2ecee",
  },
};

// Define your custom theme object, extending the default theme
export const theme: AppTheme = {
  ...DefaultTheme, // Inherit all properties from the default theme
  colors: {
    ...DefaultTheme.colors, // Inherit default colors
    ...customColors, // Override with your custom colors
  },
  // You can add your own custom properties to the theme here
  // For example, custom spacing units:
  spacing: {
    x_small: 4,
    small: 8,
    medium: 16,
    large: 24,
  },
  padding: {
    x_small: 8,
    small: 12,
    large: 24,
  },
  fonts: configureFonts({ config: fontConfig }),
};

// A custom hook to use throughout your app, already typed with your custom theme
export const useAppTheme = () => useTheme<AppTheme>();

// const theme: MD3Theme = {
//   ...DefaultTheme,
//   // colors: {
//   //   ...DefaultTheme.colors,
//   //   onPrimary: "",
//   //   surface: "",
//   // },
// }; // Keep your theme definition
