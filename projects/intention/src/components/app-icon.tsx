import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { StyleProp, ViewStyle } from 'react-native';

export type AppIconName =
  | 'add'
  | 'archive'
  | 'back'
  | 'calendar'
  | 'check'
  | 'chevronRight'
  | 'delete'
  | 'edit'
  | 'refresh'
  | 'restore'
  | 'spark'
  | 'streak'
  | 'total';

const icons: Record<AppIconName, SymbolViewProps['name']> = {
  add: { ios: 'plus', android: 'add', web: 'add' },
  archive: { ios: 'archivebox', android: 'archive', web: 'archive' },
  back: { ios: 'chevron.right', android: 'arrow_forward', web: 'arrow_forward' },
  calendar: { ios: 'calendar', android: 'event', web: 'event' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  chevronRight: { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' },
  delete: { ios: 'trash', android: 'delete', web: 'delete' },
  edit: { ios: 'pencil', android: 'edit', web: 'edit' },
  refresh: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
  restore: { ios: 'arrow.uturn.backward', android: 'restore', web: 'restore' },
  spark: { ios: 'sparkles', android: 'self_improvement', web: 'self_improvement' },
  streak: { ios: 'flame', android: 'schedule', web: 'schedule' },
  total: { ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' },
};

type Props = {
  name: AppIconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export function AppIcon({ name, size = 22, color, style }: Props) {
  return <SymbolView name={icons[name]} size={size} tintColor={color} style={style} />;
}
