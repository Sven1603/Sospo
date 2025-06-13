// src/screens/Auth/LoginScreen.tsx
import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { TextInput } from "react-native-paper";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../navigation/types";
import { supabase } from "../../lib/supabase";
import StyledText from "../../components/ui/StyledText";
import StyledButton from "../../components/ui/StyledButton";
import { AppTheme, useAppTheme } from "../../theme/theme";
import StyledTextInput from "../../components/ui/StyledTextInput";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

const LoginScreen = ({ navigation }: Props) => {
  const theme = useAppTheme();
  const styles = getStyles(theme);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setErrorText("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    setLoading(false);

    if (error) {
      console.error("Login error:", error.message);
      setErrorText(error.message);
      // Alert.alert('Login Error', error.message);
    } else if (data.session) {
      // Login successful, onAuthStateChange in App.tsx will handle navigation
      console.log("Login successful, session:", data.session);
    } else {
      // Should not happen if error is null and session is null, but good to be aware
      setErrorText("An unexpected error occurred during login.");
    }
  };

  return (
    <View style={styles.container}>
      <StyledText variant="titleLarge" mb={50} alignCenter>
        Welcome Back!
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
          mode="outlined"
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
        onPress={handleLogin}
        loading={loading}
        disabled={loading || !email || !password}
        mb={theme.spacing.medium}
      >
        {loading ? "Logging In..." : "Login"}
      </StyledButton>

      <StyledButton
        variant="link"
        onPress={() => navigation.navigate("SignUp")}
        disabled={loading}
      >
        Don't have an account? Sign Up
      </StyledButton>
    </View>
  );
};

// Re-use styles from SignUpScreen or define similar ones
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

export default LoginScreen;
