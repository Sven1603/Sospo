import { IconButton, IconButtonProps } from "react-native-paper";
import { IconSource } from "react-native-paper/lib/typescript/components/Icon";
import { useAppTheme } from "../../theme/theme";
import { ViewStyle } from "react-native";

interface StyledIconButtonProps extends IconButtonProps {
  icon: IconSource;
  variant?: "primary" | "plain";
  buttonSize?: "small" | "medium" | "large";
}

const StyledIconButton: React.FC<StyledIconButtonProps> = ({
  icon,
  variant = "primary",
  buttonSize = "medium",
  ...rest
}) => {
  const theme = useAppTheme();

  const getColor = () => {
    switch (variant) {
      case "primary":
        return theme.colors.onPrimary;
      case "plain":
        return theme.colors.onBackground;
      default:
        return "";
    }
  };

  const getSize = () => {
    switch (buttonSize) {
      case "small":
        return 16;
      case "medium":
        return 24;
      case "large":
        return 32;
      default:
        return 24;
    }
  };

  const getColorStyles = (): ViewStyle => {
    switch (variant) {
      case "primary":
        return {
          backgroundColor: theme.colors.primary,
        };
      case "plain":
        return {
          backgroundColor: theme.colors.background,
        };
      default:
        return {};
    }
  };

  return (
    <IconButton
      size={getSize()}
      icon={icon}
      iconColor={getColor()}
      style={getColorStyles()}
      {...rest}
    />
  );
};

export default StyledIconButton;
