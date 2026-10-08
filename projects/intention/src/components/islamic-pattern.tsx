import { StyleSheet, View } from 'react-native';
import { colors } from '@/theme/theme';

/** A quiet eight-point geometric motif, decorative and hidden from screen readers. */
export function IslamicPattern() {
  return (
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.pattern}>
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <View key={index} style={[styles.star, { top: Math.floor(index / 2) * 82 - 12, left: (index % 2) * 82 - 24 }]}>
          <View style={styles.square} />
          <View style={[styles.square, styles.rotated]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pattern: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 155, opacity: 0.15, overflow: 'hidden' },
  star: { position: 'absolute', width: 70, height: 70, alignItems: 'center', justifyContent: 'center' },
  square: { position: 'absolute', width: 48, height: 48, borderWidth: 1, borderColor: colors.gold },
  rotated: { transform: [{ rotate: '45deg' }] },
});
