import { Chip, ChipProps } from "react-native-paper";
import { AppTheme, useAppTheme } from "../../theme/theme";
import { StyleSheet } from "react-native";

interface StyledChipProps extends ChipProps {}

const StyledChip: React.FC<StyledChipProps> = ({ children, ...rest }) => {
  const theme = useAppTheme();
  const styles = getStyles(theme);

  return (
    <Chip
      style={styles.defaultStyles}
      textStyle={styles.defaultTextStyles}
      {...rest}
    >
      {children}
    </Chip>
  );
};

const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    defaultStyles: {
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
    },
    defaultTextStyles: {
      color: theme.colors.onSurface,
    },
  });

export default StyledChip;
