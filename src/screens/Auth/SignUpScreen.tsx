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
import { signUpSchema } from "./schemas";

type Props = NativeStackScreenProps<AuthStackParamList, "SignUp">;

const SignUpScreen = ({ navigation }: Props) => {
  const theme = useAppTheme();
  const styles = getStyles(theme);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const handleSignUp = async () => {
    setLoading(true);
    setErrors({});

    // 1. Validate inputs with Zod
    const validationResult = signUpSchema.safeParse({
      email,
      password,
      username,
    });

    if (!validationResult.success) {
      const zodErrors = validationResult.error.flatten().fieldErrors;
      const newErrors: Record<string, string | undefined> = {};
      if (zodErrors.email) newErrors.email = zodErrors.email[0];
      if (zodErrors.password) newErrors.password = zodErrors.password[0];
      if (zodErrors.username) newErrors.username = zodErrors.username[0];
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    // 2. Call Supabase signUp with username in metadata
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: validationResult.data.email,
      password: validationResult.data.password,
      options: {
        // This 'data' is passed as user_metadata and picked up by our trigger
        data: {
          username: validationResult.data.username,
          // full_name could be added here too if collected on sign-up
        },
      },
    });

    if (error) {
      Alert.alert("Sign Up Error", error.message);
    } else if (!session) {
      Alert.alert(
        "Sign Up Successful!",
        "Please check your inbox for a verification email to complete the registration.",
        [{ text: "Login now", onPress: () => navigation.navigate("Login") }]
      );
    }
    // onAuthStateChange listener will handle navigation
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <StyledText variant="titleLarge" mb={50} alignCenter>
        Create Account
      </StyledText>

      <View style={styles.inputContainer}>
        <StyledTextInput
          label="Username"
          value={username}
          onChangeText={setUsername}
          errorText={errors.username}
        />
        <StyledTextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          errorText={errors.email}
        />

        <StyledTextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          errorText={errors.password}
        />
      </View>

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
