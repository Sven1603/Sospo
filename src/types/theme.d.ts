// src/types/theme.d.ts
import "react-native-paper";
import { AppTheme } from "../theme/theme"; // Import your custom theme type

declare global {
  namespace ReactNativePaper {
    interface Theme extends AppTheme {}
  }
}
