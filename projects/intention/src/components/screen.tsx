import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewStyle, type StyleProp } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/theme/theme';

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  includeBottomInset?: boolean;
}>;

export function Screen({ children, style, includeBottomInset = true }: Props) {
  return (
    <SafeAreaView
      edges={includeBottomInset ? ['top', 'bottom'] : ['top']}
      style={[styles.safeArea, style]}>
      <StatusBar style="dark" />
      <View style={styles.fill}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
});
