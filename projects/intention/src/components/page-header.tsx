import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AppIcon } from './app-icon';
import { AppText } from './app-text';
import { colors, fonts, spacing } from '@/theme/theme';

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
};

export function PageHeader({ title, subtitle, onBack, rightAction }: Props) {
  const goBack = onBack ?? (() => router.back());
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="رجوع"
        hitSlop={10}
        onPress={goBack}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
        <AppIcon name="back" size={23} color={colors.text} />
      </Pressable>
      <View style={styles.titleArea}>
        <AppText numberOfLines={1} style={styles.title}>{title}</AppText>
        {subtitle ? <AppText numberOfLines={1} style={styles.subtitle}>{subtitle}</AppText> : null}
      </View>
      <View style={styles.right}>{rightAction}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 64,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.65 },
  titleArea: { flex: 1, paddingHorizontal: spacing.md },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 26, lineHeight: 42 },
  subtitle: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  right: { width: 44, alignItems: 'flex-end' },
});
