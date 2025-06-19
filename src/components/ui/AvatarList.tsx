import { StyleSheet, View } from "react-native";
import { ProfileStub } from "../../types/commonTypes";
import StyledText from "./StyledText";
import { Avatar } from "react-native-paper";
import { AppTheme, useAppTheme } from "../../theme/theme";

interface AvatarListProps {
  profiles: (ProfileStub | null | undefined)[] | undefined;
}

const MAX_AVATARS = 8;

const AvatarList: React.FC<AvatarListProps> = ({ profiles }) => {
  const theme = useAppTheme();
  const styles = getStyles(theme);

  if (!profiles) {
    return <StyledText>No members yet, join us!</StyledText>;
  }

  const exceedsMaxAvatars = profiles.length > MAX_AVATARS;

  return (
    <View style={styles.container}>
      {profiles.slice(0, 8).map((profile, index) => (
        <Avatar.Text
          size={28}
          label={
            profile?.username?.substring(0, 2).toUpperCase() ||
            profile?.id.substring(0, 2).toUpperCase() ||
            "??"
          }
          style={index > 0 && styles.avatar}
          key={`profile-${index}`}
        ></Avatar.Text>
      ))}
      {exceedsMaxAvatars && (
        <View style={styles.extraProfiles}>
          <StyledText variant="bodyLarge">+ {profiles.length - 8}</StyledText>
        </View>
      )}
    </View>
  );
};

const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
    },
    avatar: {
      marginLeft: -15,
    },
    extraProfiles: {
      marginLeft: theme.spacing.small,
    },
  });

export default AvatarList;
