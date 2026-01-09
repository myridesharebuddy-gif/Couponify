import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GoldButton from '../components/GoldButton';
import { useTheme } from '../theme';

type NativeFeaturesIntroProps = {
  visible: boolean;
  onTryScan: () => void;
  onViewFavorites: () => void;
  onContinue: () => void;
};

const NativeFeaturesIntro = ({ visible, onTryScan, onViewFavorites, onContinue }: NativeFeaturesIntroProps) => {
  const theme = useTheme();

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen">
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.text, fontFamily: theme.typography.headingBold }]}>
              Welcome to Couponify
            </Text>
            <Text style={[styles.subtitle, { color: theme.subtext, fontFamily: theme.typography.body }]}>
              Native features to help you save instantly.
            </Text>
            <View style={styles.bullets}>
              <Text style={[styles.bullet, { color: theme.text, fontFamily: theme.typography.body }]}>
                📷 Scan coupons using your camera
              </Text>
              <Text style={[styles.bullet, { color: theme.text, fontFamily: theme.typography.body }]}>
                ⭐ Save deals to Favorites for quick access
              </Text>
              <Text style={[styles.bullet, { color: theme.text, fontFamily: theme.typography.body }]}>
                🔔 Get personalized deals + optional notifications
              </Text>
            </View>
            <GoldButton title="Try Scan" onPress={onTryScan} style={styles.primaryButton} />
            <GoldButton title="View Favorites" onPress={onViewFavorites} style={styles.primaryButton} />
            <Pressable onPress={onContinue} style={styles.skipButton}>
              <Text style={[styles.skipText, { color: theme.subtext, fontFamily: theme.typography.bodySemiBold }]}>
                Continue
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center'
  },
  title: {
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20
  },
  bullets: {
    gap: 12,
    marginBottom: 24
  },
  bullet: {
    fontSize: 18
  },
  primaryButton: {
    marginBottom: 12
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8
  },
  skipText: {
    fontSize: 16,
    textDecorationLine: 'underline'
  }
});

export default NativeFeaturesIntro;
