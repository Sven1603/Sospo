import React from "react";
import { Button, useTheme } from "react-native-paper";
import type { ButtonProps, MD3Theme } from "react-native-paper";
import { StyleSheet, TextStyle, ViewStyle } from "react-native";

const BORDER_RADIUS = 32;

interface StyledButtonProps extends ButtonProps {
  variant?: "primary" | "secondary" | "outline" | "link";
  size?: "small" | "medium" | "large";
  ml?: number;
  mr?: number;
  mt?: number;
  mb?: number;
}

const StyledButton: React.FC<StyledButtonProps> = ({
  children,
  variant = "primary",
  size = "medium",
  style,
  labelStyle,
  ml,
  mr,
  mt,
  mb,
  ...rest
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  const getButtonStyles = (): ViewStyle => {
    switch (variant) {
      case "primary":
        return {
          backgroundColor: theme.colors.primary,
        };
      case "secondary":
        return {
          backgroundColor: theme.colors.secondary,
        };
      case "outline":
        return {
          backgroundColor: "transparent",
          borderColor: theme.colors.primary,
          borderWidth: 1,
        };
      case "link":
        return {
          backgroundColor: "transparent",
        };
      default:
        return {};
    }
  };

  const getLabelStyles = (): TextStyle => {
    switch (variant) {
      case "primary":
        return {
          color: theme.colors.onPrimaryContainer,
        };
      case "secondary":
        return {
          color: theme.colors.onPrimary,
        };
      case "outline":
        return {
          color: theme.colors.primary,
        };
      case "link":
        return {
          color: theme.colors.primary,
        };
      default:
        return {};
    }
  };

  const getSizeStyles = (): ViewStyle => {
    if (variant === "link")
      return {
        marginVertical: 0,
        borderRadius: BORDER_RADIUS,
        padding: 0,
        marginHorizontal: 0,
      };

    switch (size) {
      case "small":
        return {
          paddingVertical: 5,
          paddingHorizontal: 10,
          borderRadius: BORDER_RADIUS * 2,
        };
      case "medium":
        return {
          paddingVertical: 8,
          paddingHorizontal: 20,
          borderRadius: BORDER_RADIUS,
        };
      case "large":
        return {
          paddingVertical: 12,
          paddingHorizontal: 30,
          borderRadius: BORDER_RADIUS * 3,
        };
      default:
        return {};
    }
  };

  const getSizeLabelStyles = (): TextStyle => {
    switch (size) {
      case "small":
        return {
          fontSize: 16,
        };
      case "medium":
        return {
          fontSize: 20,
        };
      case "large":
        return {
          fontSize: 24,
        };
      default:
        return {};
    }
  };

  return (
    <Button
      mode={
        variant === "outline"
          ? "outlined"
          : variant === "link"
          ? "text"
          : "contained"
      }
      style={[
        styles.defaultButton,
        getButtonStyles(),
        getSizeStyles(),
        style,
        variant === "link" && { padding: 0, margin: 0 },
        ml !== undefined && { marginLeft: ml },
        mr !== undefined && { marginRight: mr },
        mt !== undefined && { marginTop: mt },
        mb !== undefined && { marginBottom: mb },
      ]}
      labelStyle={[
        styles.defaultLabel,
        getLabelStyles(),
        getSizeLabelStyles(),
        labelStyle,
      ]}
      uppercase={false}
      {...rest}
    >
      {children}
    </Button>
  );
};

const getStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    defaultButton: {
      marginVertical: 5,
    },
    defaultLabel: {
      fontFamily: "LeagueSpartan-SemiBold",
      fontWeight: "semibold",
      color: theme.colors.background,
    },
  });

export default StyledButton;
