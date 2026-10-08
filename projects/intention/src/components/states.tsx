import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AppButton } from './app-button';
import { AppIcon } from './app-icon';
import { AppText } from './app-text';
import { colors, spacing } from '@/theme/theme';

export function LoadingState({ label = 'بنحمّل نواياك…' }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText style={styles.message}>{label}</AppText>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <View style={styles.iconCircle}>
        <AppIcon name="refresh" color={colors.primary} size={30} />
      </View>
      <AppText style={styles.title}>محتاجين نحاول تاني</AppText>
      <AppText style={styles.message}>{message}</AppText>
      {onRetry ? <AppButton label="حاول تاني" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  message: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
