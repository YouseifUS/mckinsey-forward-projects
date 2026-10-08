import { useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { AppIcon } from './app-icon';
import { AppText } from './app-text';
import { colors, radius, spacing } from '@/theme/theme';

type Props = {
  completed: boolean;
  onToggle: () => Promise<void>;
  onError?: (message: string) => void;
  compact?: boolean;
};

export function CompletionButton({ completed, onToggle, onError, compact = false }: Props) {
  const [optimisticCompleted, setOptimisticCompleted] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [scale] = useState(() => new Animated.Value(1));
  const displayedCompleted = optimisticCompleted ?? completed;

  const handlePress = async () => {
    if (busy) return;
    const next = !displayedCompleted;
    setBusy(true);
    setOptimisticCompleted(next);
    setShowMessage(next);
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.94, duration: 90, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start();

    try {
      await onToggle();
      setOptimisticCompleted(null);
    } catch (error) {
      setOptimisticCompleted(null);
      setShowMessage(false);
      onError?.(error instanceof Error ? error.message : 'مقدرناش نحفظ الإكمال.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={displayedCompleted ? 'التراجع عن إكمال اليوم' : 'إكمال عادة اليوم'}
          accessibilityState={{ checked: displayedCompleted, busy }}
          disabled={busy}
          onPress={handlePress}
          style={({ pressed }) => [
            styles.button,
            compact && styles.compact,
            displayedCompleted && styles.completed,
            pressed && styles.pressed,
          ]}>
          <View style={[styles.check, displayedCompleted && styles.checkCompleted]}>
            {displayedCompleted ? <AppIcon name="check" size={16} color={colors.white} /> : null}
          </View>
          <AppText style={[styles.label, displayedCompleted && styles.labelCompleted]}>
            {displayedCompleted ? 'اكتملت اليوم' : 'أكمل اليوم'}
          </AppText>
        </Pressable>
      </Animated.View>
      {showMessage && !compact ? (
        <AppText accessibilityLiveRegion="polite" style={styles.message}>
          خطوة جديدة ناحية الشخص اللي ناوي تكونه.
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  button: {
    minHeight: 54,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  compact: { minHeight: 48 },
  completed: { backgroundColor: '#E6EEE1', borderColor: '#C2D4BC' },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCompleted: { backgroundColor: colors.success, borderColor: colors.success },
  label: { color: colors.primaryDark, fontSize: 15, fontWeight: '800' },
  labelCompleted: { color: colors.success },
  pressed: { opacity: 0.75 },
  message: { color: colors.success, fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
