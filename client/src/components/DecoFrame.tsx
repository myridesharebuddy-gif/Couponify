import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Line } from 'react-native-svg';
import { useTheme } from '../theme';

type DecoFrameProps = {
  enabled?: boolean;
};

const DecoFrame = ({ enabled = true }: DecoFrameProps) => {
  const theme = useTheme();
  if (!enabled) {
    return null;
  }
  return (
    <View style={styles.wrapper} pointerEvents="none">
      <Svg viewBox="0 0 100 100" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Rect x="3" y="3" width="94" height="94" stroke={theme.border} strokeWidth="1.5" fill="none" />
        <Line x1="3" y1="18" x2="25" y2="18" stroke={theme.border} strokeWidth="1.2" />
        <Line x1="3" y1="18" x2="3" y2="25" stroke={theme.border} strokeWidth="1.2" />
        <Line x1="97" y1="18" x2="75" y2="18" stroke={theme.border} strokeWidth="1.2" />
        <Line x1="97" y1="18" x2="97" y2="25" stroke={theme.border} strokeWidth="1.2" />
        <Line x1="3" y1="82" x2="25" y2="82" stroke={theme.border} strokeWidth="1.2" />
        <Line x1="3" y1="82" x2="3" y2="75" stroke={theme.border} strokeWidth="1.2" />
        <Line x1="97" y1="82" x2="75" y2="82" stroke={theme.border} strokeWidth="1.2" />
        <Line x1="97" y1="82" x2="97" y2="75" stroke={theme.border} strokeWidth="1.2" />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject
  }
});

export default DecoFrame;
