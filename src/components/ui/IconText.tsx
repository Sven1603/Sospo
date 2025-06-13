import { StyleSheet, View } from "react-native";
import { Icon } from "react-native-paper";
import { VariantProp } from "react-native-paper/lib/typescript/components/Typography/types";
import StyledText from "./StyledText";
import { AppTheme, useAppTheme } from "../../theme/theme";

interface IconTextProps {
  icon: string;
  label: string;
  iconSize?: number;
  textVariant?: VariantProp<string>;
}
const IconText: React.FC<IconTextProps> = ({
  icon,
  label,
  iconSize = 14,
  textVariant = "bodyMedium",
}) => {
  const theme = useAppTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      <Icon source={icon} size={iconSize} color={theme.colors.onBackground} />
      <StyledText variant={textVariant}>{label}</StyledText>
    </View>
  );
};

const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
  });

export default IconText;
