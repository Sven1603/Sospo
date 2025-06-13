import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { Icon } from "react-native-paper";
import StyledText from "./StyledText";
import IconText from "./IconText";
import { AppTheme, useAppTheme } from "../../theme/theme";
import { ListedClub } from "../../types/clubTypes";

interface ClubListItemProps {
  club: ListedClub;
  onPress: () => void;
}

const ClubListItem: React.FC<ClubListItemProps> = ({ club, onPress }) => {
  const theme = useAppTheme();
  const styles = getStyles(theme);

  return (
    <TouchableOpacity onPress={onPress}>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.avatar}>
            {club.cover_image_url && <Image src={club.cover_image_url}></Image>}
          </View>
          <View style={styles.clubDetails}>
            <StyledText variant="titleSmall">{club.name}</StyledText>
            {club.member_count && (
              <IconText
                icon="account-group-outline"
                label={club.member_count.toString()}
              />
            )}
            <IconText
              icon={club.privacy === "public" ? "earth" : "eye-outline"}
              label={club.privacy}
            />
          </View>
        </View>
        <Icon
          source="chevron-right"
          color={theme.colors.onBackground}
          size={16}
        />
      </View>
    </TouchableOpacity>
  );
};

const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      backgroundColor: theme.colors.background,
    },
    content: {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    avatar: {
      width: 60,
      height: 60,
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
    },
    clubDetails: {
      display: "flex",
      gap: 4,
    },
  });

export default ClubListItem;
