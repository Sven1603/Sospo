// App.tsx
import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Provider as PaperProvider, DefaultTheme } from "react-native-paper";
import { View } from "react-native";
import { Text } from "react-native-paper";

import AuthNavigator from "./src/navigation/AuthNavigator";
import MainAppStackNavigator from "./src/navigation/MainAppStackNavigator";
import { RootStackParamList } from "./src/navigation/types";
import { supabase } from "./src/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { enGB, registerTranslation } from "react-native-paper-dates";
registerTranslation("en-GB", enGB);

const RootStack = createNativeStackNavigator<RootStackParamList>();

const theme = {
  /* ... your theme ... */
}; // Keep your theme definition

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {session && session.user ? (
            <RootStack.Screen
              name="MainAppStack"
              component={MainAppStackNavigator}
            /> // Use MainAppStack here
          ) : (
            <RootStack.Screen name="Auth" component={AuthNavigator} />
          )}
        </RootStack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
