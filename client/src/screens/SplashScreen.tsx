import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Image, useWindowDimensions, Easing } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import DecoFrame from '../components/DecoFrame';

const couponifyLogo = require('../../assets/images/couponifylogo.png');

const SplashScreen = ({ navigation }: { navigation: any }) => {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const logoDimension = Math.min(width * 0.65, 360);
  const initialX = -(logoDimension + 80);
  const exitX = width + logoDimension + 80;
  const translateX = useRef(new Animated.Value(initialX)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const [isLogoReady, setIsLogoReady] = useState(false);
  const animationStarted = useRef(false);

  useEffect(() => {
    if (!isLogoReady) return;
    if (animationStarted.current) return;
    animationStarted.current = true;

    const bobbing = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -6,
          duration: 300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(translateY, {
          toValue: 4,
          duration: 300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ]),
      { iterations: -1 }
    );

    const tilting = Animated.loop(
      Animated.sequence([
        Animated.timing(rotate, {
          toValue: 1,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(rotate, {
          toValue: -1,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ]),
      { iterations: -1 }
    );

    const moveIn = Animated.timing(translateX, {
      toValue: 0,
      duration: 1500,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true
    });

    const fadeLogoIn = Animated.timing(logoOpacity, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true
    });

    const pause = Animated.delay(400);

    const moveOut = Animated.timing(translateX, {
      toValue: exitX,
      duration: 1300,
      easing: Easing.in(Easing.exp),
      useNativeDriver: true
    });

    bobbing.start();
    tilting.start();

    Animated.sequence([
      Animated.parallel([moveIn, fadeLogoIn]),
      pause,
      moveOut
    ]).start(() => {
      bobbing.stop();
      tilting.stop();
      navigation.replace('Main');
    });

    return () => {
      bobbing.stop();
      tilting.stop();
    };
  }, [exitX, navigation, rotate, translateX, translateY, logoOpacity, isLogoReady]);

  const handleCenterLayout = () => {
    if (isLogoReady) return;
    translateX.setValue(initialX);
    setIsLogoReady(true);
  };

  const rotation = rotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-1.5deg', '1.5deg']
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <DecoFrame />
      <View style={styles.content}>
        <View style={styles.centerArea} onLayout={handleCenterLayout}>
          <Animated.View
            style={[
              styles.logoWrapper,
              {
                opacity: logoOpacity,
                transform: [
                  { translateX },
                  { translateY },
                  { rotate: rotation }
                ]
              }
            ]}
          >
            <Image
              source={couponifyLogo}
              style={[styles.logo, { width: logoDimension, height: logoDimension }]}
              resizeMode="contain"
            />
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'stretch'
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%'
  },
  centerArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  logoWrapper: {
    alignItems: 'center'
  },
  logo: {
    marginBottom: 14
  },
});

export default SplashScreen;
