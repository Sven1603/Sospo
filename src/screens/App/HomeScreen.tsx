// src/screens/App/HomeScreen.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper'; // Added Button & ActivityIndicator
import { supabase } from '../../lib/supabase'; // Import Supabase client

const HomeScreen = () => {
  const [loading, setLoading] = React.useState(false);

  const handleLogout = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setLoading(false);
    if (error) {
      console.error('Error logging out:', error.message);
      // Optionally show an alert to the user
      // Alert.alert("Logout Error", error.message);
    }
    // The onAuthStateChange listener in App.tsx will handle navigation to Auth flow
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Home Screen (Sospo)</Text>
      <Text variant="bodyLarge" style={styles.welcomeText}>You are logged in!</Text>
      {loading ? (
        <ActivityIndicator animating={true} style={styles.logoutButton} />
      ) : (
        <Button
          mode="contained"
          onPress={handleLogout}
          style={styles.logoutButton}
          icon="logout"
        >
          Logout
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    marginBottom: 16,
  },
  welcomeText: {
    marginBottom: 24,
    textAlign: 'center',
  },
  logoutButton: {
    marginTop: 20,
    width: '60%', // Or adjust as needed
  },
});

export default HomeScreen;