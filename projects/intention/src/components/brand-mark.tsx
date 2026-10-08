import { Image, type ImageStyle, type StyleProp } from 'react-native';

export function BrandMark({ size = 48, style }: { size?: number; style?: StyleProp<ImageStyle> }) {
  return <Image source={require('../../assets/images/brand-mark.png')} accessibilityIgnoresInvertColors accessible={false} style={[{ width: size, height: size }, style]} />;
}
