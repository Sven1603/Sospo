import {
  ImageBackground,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Card } from "react-native-paper";
import StyledText from "./StyledText";
import { ListedEvent } from "../../types/eventTypes";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../navigation/types";
import { AppTheme, useAppTheme } from "../../theme/theme";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

interface EventCardProps {
  event: ListedEvent;
}
type NavigationProps = NativeStackNavigationProp<MainAppStackParamList>;

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const theme = useAppTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<NavigationProps>();

  return (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate("EventDetailScreen", {
          eventId: event.id,
          eventName: event.name,
        })
      }
    >
      <ImageBackground
        source={{
          uri:
            event.cover_image_url ??
            "https://wjnsiwaxvnavqmzprtzi.supabase.co/storage/v1/object/public/event-images//default-cover.jpg",
        }}
        style={styles.container}
        imageStyle={{ borderRadius: 8 }}
      >
        <LinearGradient
          colors={["transparent", "rgba(6, 26, 44, .75)"]}
          locations={[0.15, 0.7]}
          style={styles.colorOverlay}
        />
        {/* {eventisParticipant && <StyledText variant="bodySmall">You're in!</StyledText>} */}
        <StyledText variant="bodySmall" alignCenter>
          {new Date(event.start_time).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </StyledText>
        <StyledText variant="titleMedium" alignCenter>
          {event.name}
        </StyledText>
        {event.host_club_name && (
          <StyledText variant="bodySmall" alignCenter>
            by {event.host_club_name}
          </StyledText>
        )}
        {/* <View style={styles.eventSpecifics}>
        {eventDetails && (
          <>
            {eventDetails.distance && (
              <StyledText variant="bodySmall">
                {eventDetails.distance}
              </StyledText>
            )}
            {eventDetails.pace && (
              <StyledText variant="bodySmall">{eventDetails.pace}</StyledText>
            )}
          </>
        )}
        <StyledText variant="bodySmall">{participantCount}</StyledText>
      </View> */}
      </ImageBackground>
    </TouchableOpacity>
  );
};

const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      width: 256,
      height: 151,
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

export default EventCard;
