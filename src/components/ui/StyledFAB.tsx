import { FAB, FABProps } from "react-native-paper";
import { AppTheme, useAppTheme } from "../../theme/theme";
import { StyleSheet } from "react-native";

const StyledFAB = ({ ...rest }: FABProps) => {
  const theme = useAppTheme();
  const styles = getStyles(theme);

  return <FAB style={styles.fab} {...rest} />;
};

const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    fab: {
      position: "absolute",
      margin: 16,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.primary,
      borderRadius: 40,
    },
  });

export default StyledFAB;
