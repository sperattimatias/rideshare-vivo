import type { Database, Json } from './database.types';

export type NotificationRow = Database['public']['Tables']['notifications']['Row'];

export interface UINotification {
  id: string;
  type: string;
  title: string;
  message: string;
  icon: string;
  color: string;
  link: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  play_sound: boolean;
  priority: 'low' | 'normal' | 'high';
}

const typeDefaults: Record<string, Pick<UINotification, 'icon' | 'color' | 'play_sound' | 'priority'>> = {
  SUPPORT_MESSAGE: { icon: 'MessageCircle', color: 'blue', play_sound: true, priority: 'normal' },
  TRIP_UPDATE: { icon: 'Car', color: 'green', play_sound: true, priority: 'normal' },
  PAYMENT: { icon: 'CreditCard', color: 'purple', play_sound: false, priority: 'normal' },
  ALERT: { icon: 'AlertCircle', color: 'red', play_sound: true, priority: 'high' },
  LOCATION: { icon: 'MapPin', color: 'orange', play_sound: false, priority: 'normal' },
  RATING: { icon: 'Star', color: 'yellow', play_sound: false, priority: 'low' },
};

const isJsonObject = (value: Json | null): value is Record<string, Json> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getString = (obj: Record<string, Json>, key: string): string | null => {
  const value = obj[key];
  return typeof value === 'string' ? value : null;
};

const getBoolean = (obj: Record<string, Json>, key: string): boolean | null => {
  const value = obj[key];
  return typeof value === 'boolean' ? value : null;
};

export const mapNotificationRowToUI = (row: NotificationRow): UINotification => {
  const defaults = typeDefaults[row.type] ?? {
    icon: 'MessageCircle',
    color: 'gray',
    play_sound: false,
    priority: 'normal' as const,
  };

  const dataObject = isJsonObject(row.data) ? row.data : null;

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    icon: dataObject ? getString(dataObject, 'icon') ?? defaults.icon : defaults.icon,
    color: dataObject ? getString(dataObject, 'color') ?? defaults.color : defaults.color,
    link: dataObject ? getString(dataObject, 'link') : null,
    is_read: row.is_read,
    read_at: row.read_at,
    created_at: row.created_at,
    play_sound: dataObject ? getBoolean(dataObject, 'play_sound') ?? defaults.play_sound : defaults.play_sound,
    priority: (() => {
      const value = dataObject ? getString(dataObject, 'priority') : null;
      if (value === 'low' || value === 'normal' || value === 'high') return value;
      return defaults.priority;
    })(),
  };
};
