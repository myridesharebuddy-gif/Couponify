import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useTheme } from '../theme';

const couponifyLogo = require('../../assets/images/couponifylogo.png');

const WINDOW_WIDTH = Dimensions.get('window').width;
const LOGO_SIZE = Math.min(WINDOW_WIDTH * 0.45, 220);
const START_X = -LOGO_SIZE - 40;
const END_X = WINDOW_WIDTH + 40;

const CROSS_DURATION = 2000;
const LOOP_DELAY = 150;

export default function LoadingOverlay() {
  const theme = useTheme();
  const translateX = useRef(new Animated.Value(START_X)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: END_X,
          duration: CROSS_DURATION,
          easing: Easing.linear,
          useNativeDriver: true
        }),
        Animated.timing(translateX, {
          toValue: START_X,
          duration: 0,
          useNativeDriver: true
        }),
        Animated.delay(LOOP_DELAY)
      ])
    );

    loop.start();

    return () => loop.stop();
  }, [translateX]);

  return (
    <View style={[styles.overlay, { backgroundColor: theme.background }]}>
      <Animated.Image
        source={couponifyLogo}
        style={[
          styles.logo,
          {
            width: LOGO_SIZE,
            height: LOGO_SIZE,
            transform: [{ translateX }]
          }
        ]}
        resizeMode="contain"
      />

      <View style={styles.dedication}>
        <Text style={[styles.dedicationText, { color: theme.text }]}>Dedicated To My Wife</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    width: '100%',
    minHeight: '100%',
    zIndex: 9999,
    elevation: 9999,
    justifyContent: 'center',
    alignItems: 'center'
  },
  logo: {
    position: 'absolute'
  },
  dedication: {
    position: 'absolute',
    bottom: 48,
    opacity: 0.3
  },
  dedicationText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic'
  }
});
