// src/components/ui/HorizontalListSection.tsx
import React from "react";
import { View, StyleSheet, FlatList } from "react-native";
import { ActivityIndicator } from "react-native-paper";
import StyledText from "./StyledText";
import { AppTheme, useAppTheme } from "../../theme/theme";
import StyledButton from "./StyledButton";

interface HorizontalListSectionProps<T> {
  title: string;
  data: T[] | undefined;
  renderItem: ({ item }: { item: T }) => React.ReactElement | null;
  keyExtractor: (item: T, index: number) => string;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onSeeAllPress?: () => void;
  emptyMessage?: string;
  cardWidth?: number;
}

// We use a generic <T> to make this component work with any type of data (events, clubs, etc.)
const HorizontalListSection = <T,>({
  title,
  data,
  renderItem,
  keyExtractor,
  isLoading,
  isError,
  error,
  onSeeAllPress,
  emptyMessage = "Nothing here yet.",
}: HorizontalListSectionProps<T>) => {
  const theme = useAppTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      );
    }
    if (isError) {
      return (
        <View style={styles.emptySectionText}>
          <StyledText>Error: {error?.message}</StyledText>
        </View>
      );
    }
    if (!data || data.length === 0) {
      return (
        <View style={styles.emptySectionText}>
          <StyledText>{emptyMessage}</StyledText>
        </View>
      );
    }

    return (
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalListContent}
      />
    );
  };

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <StyledText variant="titleMedium">{title}</StyledText>
        {onSeeAllPress && (
          <StyledButton variant="link" size="small" onPress={onSeeAllPress}>
            Show all
          </StyledButton>
        )}
      </View>
      {renderContent()}
    </View>
  );
};

const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    sectionContainer: {
      marginVertical: 12,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
    },
    horizontalListContent: {
      paddingLeft: 16,
      paddingRight: 6,
    },
    emptySectionText: {
      paddingHorizontal: 16,
    },
    centered: {
      height: 100,
      justifyContent: "center",
      alignItems: "center",
    },
  });

export default HorizontalListSection;
