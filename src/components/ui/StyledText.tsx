import { StyleSheet, TextStyle, ViewStyle } from "react-native";
import { Text, TextProps } from "react-native-paper";
import { AppTheme, useAppTheme } from "../../theme/theme";
import { MD3Colors } from "react-native-paper/lib/typescript/types";

const FONT_SIZE = 12;

interface StyledTextProps extends TextProps<string> {
  alignCenter?: boolean;
  ml?: number;
  mr?: number;
  mt?: number;
  mb?: number;
  xs?: TextStyle;
  color?: string;
}

const StyledText: React.FC<StyledTextProps> = ({
  children,
  variant = "bodyMedium",
  alignCenter = false,
  xs,
  ml,
  mr,
  mt,
  mb,
  color,
  ...rest
}) => {
  const theme = useAppTheme();
  const styles = getStyles(theme);

  const getFontVariantStyles = (): TextStyle => {
    switch (variant) {
      case "bodySmall":
        return {
          fontSize: FONT_SIZE * 0.9,
        };
      case "bodyMedium":
        return {
          fontSize: FONT_SIZE,
        };
      case "bodyLarge":
        return {
          fontSize: FONT_SIZE * 1.2,
        };
      case "titleSmall":
        return {
          fontSize: FONT_SIZE * 1.3,
          fontWeight: "semibold",
          fontFamily: "LeagueSpartan-SemiBold",
        };
      case "titleMedium":
        return {
          fontSize: FONT_SIZE * 1.8,
          fontWeight: "semibold",
          fontFamily: "LeagueSpartan-SemiBold",
          marginBottom: theme.spacing.small,
        };
      case "titleLarge":
        return {
          fontSize: FONT_SIZE * 2.1,
          fontWeight: "semibold",
          fontFamily: "LeagueSpartan-SemiBold",
        };
      case "displayLarge":
      case "displayMedium":
      case "displaySmall":
      case "headlineLarge":
      case "headlineMedium":
      case "headlineSmall":
      case "labelLarge":
      case "labelMedium":
      case "labelSmall":
      default:
        return {};
    }
  };

  return (
    <Text
      style={[
        styles.defaultText,
        getFontVariantStyles(),
        alignCenter && { textAlign: "center" },
        ml !== undefined && { marginLeft: ml },
        mr !== undefined && { marginRight: mr },
        mt !== undefined && { marginTop: mt },
        mb !== undefined && { marginBottom: mb },
        xs,
        color && { color: color },
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
};

const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    defaultText: {
      fontFamily: "LeagueSpartan-Regular",
      color: theme.colors.onBackground,
    },
  });

export default StyledText;
