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
      <TextInput mode="outlined" error={errorText ? true : false} {...rest} />
      {errorText && (
        <View style={styles.errorContainer}>
          <StyledText variant="bodyLarge" xs={{ color: theme.colors.error }}>
            {errorText}
          </StyledText>
        </View>
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
    errorContainer: {
      marginVertical: 0,
      paddingHorizontal: 17,
    },
  });

export default StyledTextInput;
