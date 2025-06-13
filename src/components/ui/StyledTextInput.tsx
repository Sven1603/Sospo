import { StyleSheet, View } from "react-native";
import { TextInput, TextInputProps } from "react-native-paper";
import StyledText from "./StyledText";
import { AppTheme, useAppTheme } from "../../theme/theme";

interface StyledTextInputProps extends TextInputProps {
  errorText?: string;
}

const StyledTextInput: React.FC<StyledTextInputProps> = ({
  errorText,
  ...rest
}) => {
  const theme = useAppTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      <TextInput mode="outlined" {...rest} />
      {errorText && (
        <StyledText
          variant="bodyLarge"
          xs={{ color: theme.colors.error }}
          ml={17}
        >
          {errorText}
        </StyledText>
      )}
    </View>
  );
};

const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      display: "flex",
      gap: theme.spacing.small,
    },
  });

export default StyledTextInput;
