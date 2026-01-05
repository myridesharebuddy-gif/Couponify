import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, View, useWindowDimensions, Easing } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

const couponifyLogo = require('../../assets/images/couponifylogo.png');

const AnimatedSplashScreen = ({ onDone }: { onDone: () => void }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const screenWidthRef = useRef(width);
  const logoDimension = Math.min(screenWidthRef.current * 0.55, 260);
  const translateX = useRef(new Animated.Value(-screenWidthRef.current - logoDimension)).current;
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    translateX.setValue(-screenWidthRef.current - logoDimension);
    const animation = Animated.timing(translateX, {
      toValue: screenWidthRef.current + logoDimension,
      duration: 5000,
      easing: Easing.linear,
      useNativeDriver: true
    });
    animation.start(() => {
      onDoneRef.current();
    });
    return () => {
      animation.stop();
    };
  }, []);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background, paddingBottom: Math.max(insets.bottom, 20) }]}>
      <View style={styles.track}>
        <Animated.Image
          source={couponifyLogo}
          style={[
            styles.logo,
            {
              width: logoDimension,
              height: logoDimension,
              transform: [{ translateX }]
            }
          ]}
          resizeMode="contain"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between'
  },
  track: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  logo: {
    position: 'absolute'
  },
});

export default AnimatedSplashScreen;
