import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { IconButton, MD3Theme, useTheme } from "react-native-paper";
import StyledText from "./StyledText";
import { format } from "date-fns";
import IconText from "./IconText";

interface EventListItemProps {
  startTime: string; // TODO: decide if this should be a date/timestamp
  title: string;
  organizer: string;
  location: string | null;
  participantCount: number;
  eventDetails?: {
    distance?: number;
    pace?: number;
  };
  privacy: "public" | "private" | "controlled";
  onPress: () => void;
}

const EventListItem = ({
  startTime,
  title,
  organizer,
  location,
  participantCount,
  eventDetails,
  privacy,
  onPress,
}: EventListItemProps) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.startTime}>
        <StyledText variant="titleSmall" alignCenter>
          {format(startTime, "kk:mm")}
        </StyledText>
      </View>
      <View style={styles.eventInfo}>
        <View style={styles.section}>
          <StyledText variant="titleSmall">{title}</StyledText>
          <StyledText variant="bodyMedium">by {organizer}</StyledText>
        </View>
        <View style={styles.section}>
          <View style={styles.eventDetails}>
            {eventDetails && (
              <>
                {eventDetails.distance && (
                  <IconText
                    icon="map-marker-distance"
                    label={eventDetails.distance + " km"}
                  />
                )}
                {eventDetails.pace && (
                  <IconText
                    icon="timer-outline"
                    label={eventDetails.pace.toString()}
                  />
                )}
              </>
            )}
            <IconText
              icon="account-group-outline"
              label={participantCount.toString()}
            />
          </View>
          {location !== null && (
            <IconText icon="map-marker-outline" label={location} />
          )}
          <IconText
            icon={privacy === "public" ? "earth" : "eye-outline"}
            label={privacy}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const getStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    container: {
      display: "flex",
      flexDirection: "row",
      gap: 16,
      padding: 16,
    },
    startTime: {
      width: 60,
    },
    eventInfo: {
      display: "flex",
      gap: 12,
    },
    section: {
      display: "flex",
      gap: 6,
    },
    eventDetails: {
      display: "flex",
      flexDirection: "row",
      gap: 24,
    },
  });

export default EventListItem;
