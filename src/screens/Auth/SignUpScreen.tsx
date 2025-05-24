// src/screens/Auth/SignUpScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, TextInput, ActivityIndicator, HelperText } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { supabase } from '../../lib/supabase'; // Your Supabase client

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

const SignUpScreen = ({ navigation }: Props) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  const handleSignUp = async () => {
    setLoading(true);
    setErrorText(''); // Clear previous errors

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
    });

    setLoading(false);

    if (error) {
      console.error('Sign up error:', error.message);
      setErrorText(error.message);
      // Alert.alert('Sign Up Error', error.message); // Simple alert
    } else if (data.session) {
      // Sign up was successful and session is created (if email confirmation is off or auto-confirmed)
      // The onAuthStateChange listener in App.tsx should handle navigation
      console.log('Sign up successful, session:', data.session);
    } else if (data.user && !data.session) {
      // Sign up successful, but requires email confirmation
      Alert.alert(
        'Sign Up Successful!',
        'Please check your email to confirm your account.'
      );
      // Optionally navigate to login or a specific "check email" screen
      navigation.navigate('Login');
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Create Account</Text>

      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
        mode="outlined"
      />

      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
        mode="outlined"
      />

      {!!errorText && (
        <HelperText type="error" visible={!!errorText} style={styles.errorText}>
          {errorText}
        </HelperText>
      )}

      <Button
        mode="contained"
        onPress={handleSignUp}
        loading={loading}
        disabled={loading || !email || !password}
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        {loading ? 'Signing Up...' : 'Sign Up'}
      </Button>

      <Button
        onPress={() => navigation.goBack()}
        disabled={loading}
        style={styles.linkButton}
      >
        Already have an account? Login
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff', // Or your theme's background
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  linkButton: {
    marginTop: 16,
  },
  errorText: {
    marginBottom: 10,
    textAlign: 'center',
  },
});

export default SignUpScreen;