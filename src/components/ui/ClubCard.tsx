import { ImageBackground, StyleSheet, TouchableOpacity } from "react-native";
import StyledText from "./StyledText";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../navigation/types";
import { ListedClub } from "../../types/clubTypes";
import { AppTheme, useAppTheme } from "../../theme/theme";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

type ClubCardProps = {
  club: ListedClub;
};
type NavigationProps = NativeStackNavigationProp<MainAppStackParamList>;

const ClubCard: React.FC<ClubCardProps> = ({ club }) => {
  const theme = useAppTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<NavigationProps>();

  return (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate("ClubDetail", {
          clubId: club.id,
        })
      }
    >
      <ImageBackground
        source={{
          uri:
            club.cover_image_url ??
            "https://cdn.pixabay.com/photo/2021/12/12/20/00/play-6865967_640.jpg",
        }}
        style={styles.container}
        imageStyle={{ borderRadius: 8 }}
      >
        <LinearGradient
          colors={["transparent", "rgba(6, 26, 44, .75)"]}
          locations={[0.15, 0.7]}
          style={styles.colorOverlay}
        />
        <StyledText variant="titleMedium" alignCenter>
          {club.name}
        </StyledText>
        {club.location_text !== null && (
          <StyledText variant="bodySmall" alignCenter>
            {club.location_text}
          </StyledText>
        )}
        {club.member_count && club.member_count > 0 && (
          <StyledText variant="bodySmall" alignCenter>
            {club.member_count} members
          </StyledText>
        )}
      </ImageBackground>
    </TouchableOpacity>
  );
};

const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      width: 217,
      height: 148,
      borderRadius: 8,
      backgroundColor: theme.colors.surface,
      marginRight: theme.spacing.medium,
      padding: theme.padding.small,
      justifyContent: "flex-end",
      alignItems: "center",
    },
    colorOverlay: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 8,
    },
  });

export default ClubCard;
