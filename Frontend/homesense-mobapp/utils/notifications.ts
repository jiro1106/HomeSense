import * as Notifications from "expo-notifications";

export async function sendAlertNotification(
  applianceName: string,
  message: string
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `⚠️ High Usage Alert: ${applianceName}`,
      body: message,
      sound: "default",
    },
    trigger: null, // show immediately
  });
}
