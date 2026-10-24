import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { buildSchedule } from '../domain/reminders';
import type { Reminder } from '../domain/reminders';

const CHANNEL_ID = 'bp-reminders';

export type PermissionState = 'granted' | 'denied' | 'undetermined';

/** Notifications are shown while the app is open too. */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensureChannel(channelName: string): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: channelName,
    // eslint-disable-next-line import/namespace -- exported by expo-notifications (false positive)
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200],
    showBadge: false,
  });
}

export async function getPermissionState(): Promise<PermissionState> {
  const status = await Notifications.getPermissionsAsync();
  if (status.granted) return 'granted';
  return status.canAskAgain === false || status.status === 'denied' ? 'denied' : 'undetermined';
}

/** Asked in context, only when the user turns a reminder on. */
export async function requestPermission(channelName: string): Promise<PermissionState> {
  await ensureChannel(channelName);
  const status = await Notifications.requestPermissionsAsync();
  return status.granted ? 'granted' : 'denied';
}

export interface ReminderText {
  channelName: string;
  title: string;
  body: string;
}

/**
 * Makes the registered notifications match the saved reminders exactly: everything this app
 * scheduled is cancelled first, so obsolete or duplicate schedules cannot survive a change.
 * Notification content contains no health data and nothing leaves the device.
 */
let syncChain: Promise<unknown> = Promise.resolve();

/** Runs one sync at a time so overlapping calls can never register duplicate schedules. */
export function syncReminders(
  reminders: readonly Reminder[],
  pausedUntil: Date | null,
  text: ReminderText,
): Promise<number> {
  const run = syncChain.then(() => doSync(reminders, pausedUntil, text));
  syncChain = run.catch(() => undefined);
  return run;
}

async function doSync(
  reminders: readonly Reminder[],
  pausedUntil: Date | null,
  text: ReminderText,
): Promise<number> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if ((await getPermissionState()) !== 'granted') return 0;
  await ensureChannel(text.channelName);
  const slots = buildSchedule(reminders, pausedUntil);
  for (const slot of slots) {
    await Notifications.scheduleNotificationAsync({
      content: { title: text.title, body: text.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: slot.weekday,
        hour: slot.hour,
        minute: slot.minute,
        channelId: CHANNEL_ID,
      },
    });
  }
  return slots.length;
}

/** Fires a sample reminder in a few seconds so the user can preview it. */
export async function sendTestReminder(text: ReminderText): Promise<boolean> {
  if ((await getPermissionState()) !== 'granted') return false;
  await ensureChannel(text.channelName);
  await Notifications.scheduleNotificationAsync({
    content: { title: text.title, body: text.body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: CHANNEL_ID,
    },
  });
  return true;
}
