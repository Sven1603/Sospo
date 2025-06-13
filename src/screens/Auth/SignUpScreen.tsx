// src/screens/Auth/SignUpScreen.tsx
import React, { useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { TextInput } from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../navigation/types";
import { supabase } from "../../lib/supabase"; // Your Supabase client
import StyledText from "../../components/ui/StyledText";
import StyledButton from "../../components/ui/StyledButton";
import { AppTheme, useAppTheme } from "../../theme/theme";
import StyledTextInput from "../../components/ui/StyledTextInput";

type Props = NativeStackScreenProps<AuthStackParamList, "SignUp">;

const SignUpScreen = ({ navigation }: Props) => {
  const theme = useAppTheme();
  const styles = getStyles(theme);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const handleSignUp = async () => {
    setLoading(true);
    setErrorText(""); // Clear previous errors

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
    });

    setLoading(false);

    if (error) {
      console.error("Sign up error:", error.message);
      setErrorText(error.message);
      // Alert.alert('Sign Up Error', error.message); // Simple alert
    } else if (data.session) {
      // Sign up was successful and session is created (if email confirmation is off or auto-confirmed)
      // The onAuthStateChange listener in App.tsx should handle navigation
      console.log("Sign up successful, session:", data.session);
    } else if (data.user && !data.session) {
      // Sign up successful, but requires email confirmation
      Alert.alert(
        "Sign Up Successful!",
        "Please check your email to confirm your account."
      );
      // Optionally navigate to login or a specific "check email" screen
      navigation.navigate("Login");
    }
  };

  return (
    <View style={styles.container}>
      <StyledText variant="titleLarge" mb={50} alignCenter>
        Create Account
      </StyledText>

      <View style={styles.inputContainer}>
        <StyledTextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <StyledTextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      {!!errorText && (
        <StyledText
          variant="bodyLarge"
          color={theme.colors.error}
          mb={theme.spacing.small}
        >
          {errorText}
        </StyledText>
      )}

      <StyledButton
        onPress={handleSignUp}
        loading={loading}
        disabled={loading || !email || !password}
        mb={theme.spacing.medium}
      >
        {loading ? "Signing Up..." : "Sign Up"}
      </StyledButton>

      <StyledButton
        variant="link"
        onPress={() => navigation.goBack()}
        disabled={loading}
      >
        Already have an account? Login
      </StyledButton>
    </View>
  );
};

const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      padding: 20,
      backgroundColor: theme.colors.background,
    },
    inputContainer: {
      gap: theme.spacing.small,
      marginBottom: theme.spacing.medium,
    },
  });

export default SignUpScreen;
