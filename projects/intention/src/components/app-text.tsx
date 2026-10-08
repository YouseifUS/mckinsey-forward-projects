import { StyleSheet, Text, type TextProps } from 'react-native';
import { fonts } from '@/theme/theme';

/** Arabic-first text with reliable alignment even when Expo Go is running in LTR mode. */
export function AppText({ style, ...props }: TextProps) {
  const resolved = StyleSheet.flatten(style);
  const weight = resolved?.fontWeight === 'bold' ? 700 : Number(resolved?.fontWeight ?? 400);
  return <Text {...props} style={[
    { writingDirection: 'rtl', textAlign: 'right', fontFamily: weight >= 600 ? fonts.bold : fonts.body },
    style,
    // Bundled font files supply the weight; avoid synthetic bold on Arabic glyphs.
    { fontWeight: 'normal' },
  ]} />;
}
