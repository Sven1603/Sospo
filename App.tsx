// App.tsx
import React, { useState, useEffect } from "react";
import {
  NavigationContainer,
  DefaultTheme as NavigationDefaultTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Provider as PaperProvider } from "react-native-paper";
import { SafeAreaView, View } from "react-native";
import { Text } from "react-native-paper";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";

import AuthNavigator from "./src/navigation/AuthNavigator";
import MainAppStackNavigator from "./src/navigation/MainAppStackNavigator";
import { RootStackParamList } from "./src/navigation/types";
import { supabase } from "./src/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { enGB, registerTranslation } from "react-native-paper-dates";
import { theme, useAppTheme } from "./src/theme/theme";
import { useFonts } from "expo-font";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

registerTranslation("en-GB", enGB);

const RootStack = createNativeStackNavigator<RootStackParamList>();

const queryClient = new QueryClient();

export default function App() {
  const customTheme = useAppTheme();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [fontsLoaded, fontError] = useFonts({
    "LeagueSpartan-Regular": require("./assets/fonts/LeagueSpartan-Regular.ttf"),
    // 'LeagueSpartan-Medium': require('./assets/fonts/LeagueSpartan-Medium.ttf'),
    "LeagueSpartan-SemiBold": require("./assets/fonts/LeagueSpartan-SemiBold.ttf"),
    // 'LeagueSpartan-Bold': require('./assets.fonts/LeagueSpartan-Bold.ttf'),
  });

  useEffect(() => {
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const onLayoutRootView = React.useCallback(async () => {
    if (fontsLoaded || fontError) {
      // Hide the splash screen once fonts are loaded or an error occurs
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null; // Or return a custom loading component
  }

  const navigationTheme = {
    ...NavigationDefaultTheme,
    colors: {
      ...NavigationDefaultTheme.colors,
      primary: customTheme.colors.primary, // e.g., the color of active tab icons
      background: customTheme.colors.background, // The background of screens
      card: customTheme.colors.surface, // The background of headers and tab bars
      text: customTheme.colors.onSurface, // The default text color in headers
      border: customTheme.colors.outlineVariant, // The border color (e.g., header bottom border)
    },
  };

  if (loading) {
    return (
      <PaperProvider theme={theme}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text>Loading Sospo...</Text>
        </View>
      </PaperProvider>
    );
  }

  return (
    <View
      style={{ flex: 1, backgroundColor: customTheme.colors.background }}
      onLayout={onLayoutRootView}
    >
      <StatusBar
        style="light"
        backgroundColor={customTheme.colors.background}
      />
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={theme}>
          <NavigationContainer theme={navigationTheme}>
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
              {session && session.user ? (
                <RootStack.Screen
                  name="MainAppStack"
                  component={MainAppStackNavigator}
                />
              ) : (
                <RootStack.Screen name="Auth" component={AuthNavigator} />
              )}
            </RootStack.Navigator>
          </NavigationContainer>
        </PaperProvider>
      </QueryClientProvider>
    </View>
  );
}
