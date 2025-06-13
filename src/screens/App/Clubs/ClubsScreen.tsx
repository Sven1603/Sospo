import React, { useCallback } from "react";
import { View, StyleSheet, FlatList, RefreshControl } from "react-native";
import { ActivityIndicator, Divider } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../../navigation/types";
import ClubListItem from "../../../components/ui/ClubListItem";
import { useQuery } from "@tanstack/react-query";
import { fetchVisibleClubs } from "../../../services/clubService";
import { ListedClub } from "../../../types/clubTypes";
import { AppTheme, useAppTheme } from "../../../theme/theme";
import StyledText from "../../../components/ui/StyledText";
import StyledButton from "../../../components/ui/StyledButton";
import StyledFAB from "../../../components/ui/StyledFAB";

type ClubsScreenNavigationProp = NativeStackNavigationProp<
  MainAppStackParamList,
  "AppTabs"
>;

const ClubsScreen = () => {
  const navigation = useNavigation<ClubsScreenNavigationProp>();
  const theme = useAppTheme();
  const styles = getStyles(theme);

  const {
    data: clubs = [],
    isLoading,
    isError,
    error,
    refetch: refetchClubs,
    isFetching: isFetchingClubs,
  } = useQuery<ListedClub[], Error>({
    queryKey: ["visibleClubs"],
    queryFn: fetchVisibleClubs,
  });

  const onRefresh = useCallback(async () => {
    await refetchClubs();
  }, [refetchClubs]);

  const renderClubItem = ({ item }: { item: ListedClub }) => (
    <ClubListItem
      club={item}
      onPress={() => navigation.navigate("ClubDetail", { clubId: item.id })}
    />
  );

  if (isLoading && clubs.length === 0) {
    return (
      <ActivityIndicator animating={true} style={styles.loader} size="large" />
    );
  }

  if (isError) {
    return (
      <View style={styles.centeredMessageContainer}>
        <StyledText variant="bodyLarge" style={{ color: theme.colors.error }}>
          Error: {error.message}
        </StyledText>
        <StyledButton onPress={() => refetchClubs()} style={{ marginTop: 10 }}>
          Try Again
        </StyledButton>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {clubs.length === 0 && !isLoading ? (
        <View style={styles.centeredMessageContainer}>
          <StyledText variant="bodyMedium">No public clubs found.</StyledText>
          <StyledText variant="bodyMedium">Why not create one?</StyledText>
        </View>
      ) : (
        <FlatList
          data={clubs}
          keyExtractor={(item) => item.id}
          renderItem={renderClubItem}
          ItemSeparatorComponent={Divider}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isFetchingClubs}
              onRefresh={onRefresh}
            />
          }
        />
      )}
      <StyledFAB
        icon="plus"
        label="Create Club"
        onPress={() => navigation.navigate("CreateClub")}
      />
    </View>
  );
};

const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loader: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.background,
    },
    centeredMessageContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
      backgroundColor: theme.colors.background,
      gap: theme.spacing.x_small,
    },
    listContent: {
      paddingVertical: 8,
      paddingBottom: 80,
    },
  });

export default ClubsScreen;
