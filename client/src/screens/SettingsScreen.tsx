import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import { useTheme, Theme } from '../theme';
import SectionTitle from '../components/SectionTitle';
import { scaleFont } from '../theme/fontScale';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background
    },
    content: {
      padding: 16
    },
    disclaimer: {
      color: theme.subtext,
      marginTop: 8,
      fontFamily: theme.typography.body
    },
    section: {
      marginTop: 20
    },
    rewardButton: {
      marginTop: 8,
      backgroundColor: theme.accent,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center'
    },
    rewardButtonText: {
      color: theme.background,
      fontFamily: theme.typography.bodySemiBold
    },
    versionText: {
      marginTop: 24,
      textAlign: 'center',
      color: theme.subtext,
      fontFamily: theme.typography.body,
      fontSize: scaleFont(12)
    }
  });

const SettingsScreen = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation();
  const [tapCount, setTapCount] = useState(0);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const versionLabel = Constants.expoConfig?.version ?? '1.0.0';

  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
    };
  }, []);

  const handleVersionTap = () => {
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }
    setTapCount((prev) => {
      const next = prev + 1;
      if (next >= 7) {
        navigation.navigate('AdminAnalytics' as never);
        return 0;
      }
      return next;
    });
    tapTimeoutRef.current = setTimeout(() => setTapCount(0), 1400);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SectionTitle>Settings</SectionTitle>
      <Text style={styles.disclaimer}>
        Couponify is a community of people who collectively share coupons. Submissions and preferences help us tailor your feed.
      </Text>

      <View style={styles.section}>
        <SectionTitle smallCaps>Rewards</SectionTitle>
        <Pressable
          style={styles.rewardButton}
          onPress={() => Linking.openURL('http://www.rakuten.com/r/STERLI1762?eeid=28187')}
        >
          <Text style={styles.rewardButtonText}>Smart Shoppers Use Rakuten</Text>
        </Pressable>
      </View>
      <Pressable onPress={handleVersionTap}>
        <Text style={styles.versionText}>Version {versionLabel}</Text>
      </Pressable>
    </ScrollView>
  );
};

export default SettingsScreen;
