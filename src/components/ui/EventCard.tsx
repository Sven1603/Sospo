import { StyleSheet, View } from "react-native";
import { Card } from "react-native-paper";
import StyledText from "./StyledText";
import { ListedEvent } from "../../types/eventTypes";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MainAppStackParamList } from "../../navigation/types";
import { AppTheme, useAppTheme } from "../../theme/theme";
import { useNavigation } from "@react-navigation/native";

interface EventCardProps {
  event: ListedEvent;
}
type NavigationProps = NativeStackNavigationProp<MainAppStackParamList>;

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const theme = useAppTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<NavigationProps>();

  return (
    <Card
      style={styles.container}
      onPress={() =>
        navigation.navigate("EventDetailScreen", {
          eventId: event.id,
          eventName: event.name,
        })
      }
    >
      <View style={styles.content}>
        {/* {eventisParticipant && <StyledText variant="bodySmall">You're in!</StyledText>} */}
        <View style={styles.eventDetails}>
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
        </View>
      </View>
    </Card>
  );
};

const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      borderRadius: 8,
      width: 256,
      height: 151,
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
    eventDetails: {
      position: "absolute",
      width: "100%",
      bottom: 5,
      gap: theme.spacing.x_small,
    },
    eventSpecifics: {
      display: "flex",
      gap: 16,
    },
  });

export default EventCard;
