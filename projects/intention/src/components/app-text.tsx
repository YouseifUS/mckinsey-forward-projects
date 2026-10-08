import { Text, type TextProps } from 'react-native';

/** Arabic-first text with reliable alignment even when Expo Go is running in LTR mode. */
export function AppText({ style, ...props }: TextProps) {
  return <Text {...props} style={[{ writingDirection: 'rtl', textAlign: 'right' }, style]} />;
}
