// src/screens/App/ClubsScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import {
  Text,
  FAB,
  ActivityIndicator,
  Card,
  Title,
  Paragraph,
  Chip,
  useTheme,
  Button,
} from "react-native-paper";
import { useNavigation, useFocusEffect } from "@react-navigation/native"; // Added useFocusEffect
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../../navigation/types";
import { supabase } from "../../../lib/supabase";
import { Club } from "../types";

type ClubsScreenNavigationProp = NativeStackNavigationProp<
  MainAppStackParamList,
  "AppTabs"
>;

const ClubsScreen = () => {
  const navigation = useNavigation<ClubsScreenNavigationProp>();
  const theme = useTheme(); // To access theme colors

  const [loadingClubs, setLoadingClubs] = useState(true);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchClubs = useCallback(async () => {
    setLoadingClubs(true);
    setFetchError(null);
    try {
      // Fetch public clubs and their linked sport types' names
      // The join syntax club_sport_types!inner(sport_types(id, name)) ensures we only get clubs with sports.
      // If you want clubs even if they have no sports linked (shouldn't happen with our create function),
      // you might use a left join syntax: club_sport_types(sport_types(id, name))
      const { data, error } = await supabase
        .from("clubs")
        .select(
          `
          id,
          name,
          description,
          privacy,
          location_text,
          cover_image_url,
          created_at,
          club_sport_types ( sport_types ( id, name ) )
        `
        )
        // .eq('privacy', 'public') // Fetch only public clubs for now
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }
      if (data) {
        setClubs(data as Club[]);
      }
    } catch (error: any) {
      console.error("Error fetching clubs:", error);
      setFetchError(error.message || "Failed to fetch clubs.");
    } finally {
      setLoadingClubs(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch clubs when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchClubs();
    }, [fetchClubs])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchClubs();
  }, [fetchClubs]);

  const renderClubItem = ({ item }: { item: Club }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate("ClubDetail", { clubId: item.id })}
    >
      <Card style={styles.card}>
        <Card.Content>
          <Title>{item.name}</Title>
          {item.description && (
            <Paragraph numberOfLines={2}>{item.description}</Paragraph>
          )}
          {item.location_text && (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.outline, marginTop: 4 }}
            >
              {item.location_text}
            </Text>
          )}
          <View style={styles.chipContainer}>
            {item.club_sport_types &&
              item.club_sport_types.map((cst, index) => {
                // Outer map for each junction entry
                // cst is { sport_types: SportTypeStub[] | null }
                // We expect sport_types to be an array with one element due to the nature of the join
                const sportTypeObject =
                  cst.sport_types && cst.sport_types.length > 0
                    ? cst.sport_types[0]
                    : null;

                return sportTypeObject ? (
                  <Chip key={sportTypeObject.id} icon="tag" style={styles.chip}>
                    {sportTypeObject.name}
                  </Chip>
                ) : null;
              })}
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  if (loadingClubs && clubs.length === 0) {
    // Show loader only on initial load
    return (
      <ActivityIndicator animating={true} style={styles.loader} size="large" />
    );
  }

  if (fetchError) {
    return (
      <View style={styles.centeredMessageContainer}>
        <Text variant="bodyLarge" style={{ color: theme.colors.error }}>
          Error: {fetchError}
        </Text>
        <Button onPress={fetchClubs} style={{ marginTop: 10 }}>
          Try Again
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {clubs.length === 0 && !loadingClubs ? (
        <View style={styles.centeredMessageContainer}>
          <Text variant="headlineSmall">No public clubs found.</Text>
          <Text variant="bodyMedium">Why not create one?</Text>
        </View>
      ) : (
        <FlatList
          data={clubs}
          keyExtractor={(item) => item.id}
          renderItem={renderClubItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
      <FAB
        style={styles.fab}
        icon="plus"
        label="Create Club"
        onPress={() => navigation.navigate("CreateClub")}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centeredMessageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2, // for a bit of shadow
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 80, // Ensure FAB doesn't overlap last item too much
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  chip: {
    marginRight: 4,
    marginBottom: 4,
    // backgroundColor: theme.colors.secondaryContainer, // Example theming
  },
});

export default ClubsScreen;
