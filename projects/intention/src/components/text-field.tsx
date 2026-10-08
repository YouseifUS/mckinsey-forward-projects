import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { AppText } from './app-text';
import { colors, radius, spacing } from '@/theme/theme';

type Props = TextInputProps & {
  label: string;
  error?: string;
};

export function TextField({ label, error, multiline = true, ...props }: Props) {
  return (
    <View style={styles.container}>
      <AppText style={styles.label}>{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        multiline={multiline}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
        style={[styles.input, multiline && styles.multiline, error && styles.inputError]}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...props}
      />
      {error ? <AppText style={styles.error}>{error}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  label: { color: colors.text, fontSize: 14, fontWeight: '700' },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
    lineHeight: 23,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  multiline: { minHeight: 124 },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 13 },
});
