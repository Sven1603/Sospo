import { StyleSheet, View } from "react-native";
import { Card, MD3Theme, useTheme } from "react-native-paper";
import StyledText from "./StyledText";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../navigation/types";
import { ListedClub } from "../../types/clubTypes";
import { AppTheme, useAppTheme } from "../../theme/theme";
import { useNavigation } from "@react-navigation/native";

type ClubCardProps = {
  club: ListedClub;
};
type NavigationProps = NativeStackNavigationProp<MainAppStackParamList>;

const ClubCard: React.FC<ClubCardProps> = ({ club }) => {
  const theme = useAppTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<NavigationProps>();

  return (
    <Card
      style={styles.container}
      onPress={() =>
        navigation.navigate("ClubDetail", {
          clubId: club.id,
        })
      }
    >
      <View style={styles.content}>
        {/* {isMember && <StyledText variant="bodySmall">You're in!</StyledText>} */}
        <View style={styles.clubDetails}>
          <StyledText variant="titleMedium" alignCenter>
            {club.name}
          </StyledText>
          {club.location_text !== null && (
            <StyledText variant="bodySmall" alignCenter>
              {club.location_text}
            </StyledText>
          )}
          {club.member_count && (
            <StyledText variant="bodySmall" alignCenter>
              {club.member_count} members
            </StyledText>
          )}
        </View>
      </View>
    </Card>
  );
};

const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      borderRadius: 8,
      width: 217,
      height: 148,
      backgroundColor: theme.colors.surface,
      marginRight: theme.spacing.medium,
      padding: theme.padding.small,
    },
    content: {
      position: "relative",
      width: "100%",
      height: "100%",
      justifyContent: "center",
    },
    clubDetails: {
      position: "absolute",
      width: "100%",
      bottom: 5,
      gap: theme.spacing.x_small,
    },
  });

export default ClubCard;
