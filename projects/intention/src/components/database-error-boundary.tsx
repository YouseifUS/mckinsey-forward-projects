import { Component, type ErrorInfo, type PropsWithChildren } from 'react';
import { Platform, Pressable, SafeAreaView, StyleSheet, View } from 'react-native';
import { AppText } from './app-text';
import { colors, radius, spacing } from '@/theme/theme';

type State = { error: Error | null; retryKey: number };

export class DatabaseErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { error: null, retryKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Intention database initialization failed', error, info.componentStack);
  }

  retry = () => this.setState((state) => ({ error: null, retryKey: state.retryKey + 1 }));

  render() {
    if (this.state.error) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            <AppText style={styles.eyebrow}>نية</AppText>
            <AppText style={styles.title}>مقدرناش نفتح عاداتك</AppText>
            <AppText style={styles.message}>
              بياناتك متغيرتش. جرّب تفتح قاعدة البيانات المحلية تاني، ولو المشكلة استمرت اقفل التطبيق وافتحه من جديد.
            </AppText>
            <Pressable
              accessibilityRole="button"
              onPress={this.retry}
              style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
              <AppText style={styles.buttonLabel}>حاول تاني</AppText>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }

    return <View {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})} key={this.state.retryKey} style={styles.fill}>{this.props.children}</View>;
  }
}

const styles = StyleSheet.create({
  fill: { flex: 1, ...(Platform.OS !== 'web' && { direction: 'rtl' as const }) },
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  eyebrow: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  title: { color: colors.text, fontSize: 25, lineHeight: 32, fontWeight: '800', textAlign: 'center' },
  message: { color: colors.textSecondary, fontSize: 15, lineHeight: 23, textAlign: 'center' },
  button: { minHeight: 52, minWidth: 150, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  buttonLabel: { color: colors.white, fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.75 },
});
