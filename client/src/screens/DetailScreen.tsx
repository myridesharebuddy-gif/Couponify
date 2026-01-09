import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Share, Linking, Alert } from 'react-native';
import { useTheme, Theme } from '../theme';
import { scaleFont } from '../theme/fontScale';
import { CouponItem } from '../types/coupon';
import * as Clipboard from 'expo-clipboard';
import { reportDeal, verifyDeal } from '../services/api';
import { logEvent } from '../lib/analytics';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      padding: 20
    },
    title: {
      color: theme.text,
      fontSize: scaleFont(26),
      fontFamily: theme.typography.heading
    },
    subtitle: {
      marginTop: 6,
      color: theme.muted,
      fontSize: scaleFont(14),
      fontFamily: theme.typography.bodySemiBold
    },
    deal: {
      marginTop: 18,
      color: theme.text,
      fontSize: scaleFont(20),
      fontFamily: theme.typography.heading
    },
    description: {
      marginTop: 6,
      color: theme.subtext,
      fontSize: scaleFont(16),
      fontFamily: theme.typography.body
    },
    metaRow: {
      marginTop: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    metaText: {
      color: theme.subtext,
      fontSize: scaleFont(12),
      fontFamily: theme.typography.body
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 24
    },
    button: {
      flex: 1,
      marginHorizontal: 4,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.accent,
      alignItems: 'center'
    },
    buttonText: {
      color: theme.accent,
      fontFamily: theme.typography.bodySemiBold
    },
    confidenceSection: {
      marginTop: 16
    },
    sectionLabel: {
      color: theme.subtext,
      fontSize: scaleFont(12),
      fontFamily: theme.typography.bodySemiBold
    },
    sectionValue: {
      color: theme.text,
      fontSize: scaleFont(16),
      fontFamily: theme.typography.heading
    },
    reasonText: {
      color: theme.subtext,
      marginTop: 6,
      fontSize: scaleFont(13),
      fontFamily: theme.typography.body
    },
    verifyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 24
    },
    verifyButton: {
      flex: 1,
      marginHorizontal: 4,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center'
    },
    statusText: {
      marginTop: 12,
      color: theme.danger,
      fontSize: scaleFont(14),
      fontFamily: theme.typography.bodySemiBold
    }
  });

const DetailScreen = ({ route }: { route: any }) => {
  const coupon: CouponItem | undefined = route.params?.coupon;
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [status, setStatus] = useState(coupon?.status ?? 'active');
  const [confidenceReasons, setConfidenceReasons] = useState(coupon?.confidenceReasons ?? []);

  if (!coupon) {
    return (
      <View style={styles.container}>
        <Text style={[styles.subtitle, { textAlign: 'center' }]}>Coupon details are unavailable.</Text>
      </View>
    );
  }

  const share = () => {
    Share.share({ message: coupon.deal, url: coupon.sourceUrl });
  };

  const openOriginal = () => {
    if (coupon.sourceUrl) {
      Linking.openURL(coupon.sourceUrl);
    }
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(coupon.code);
    logEvent({ couponId: coupon.id, eventType: 'coupon_copy' });
    Alert.alert('Copied', 'Code copied to clipboard.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{coupon.store}</Text>
      <Text style={styles.subtitle}>{coupon.domain}</Text>
      <Text style={styles.deal}>{coupon.deal}</Text>
      <Text style={styles.description}>Source: {coupon.source}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>Posted {new Date(coupon.createdAt).toLocaleDateString()}</Text>
        <Text style={styles.metaText}>
          Expires {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : 'TBD'}
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable style={styles.button} onPress={handleCopy}>
          <Text style={styles.buttonText}>Copy code</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={openOriginal}>
          <Text style={styles.buttonText}>Open source</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={share}>
          <Text style={styles.buttonText}>Share</Text>
        </Pressable>
      </View>
      <View style={styles.confidenceSection}>
        <Text style={styles.sectionLabel}>Confidence</Text>
        <Text style={styles.sectionValue}>{Math.round(coupon.confidenceScore)}%</Text>
      </View>
      {confidenceReasons.length ? (
        <View style={styles.confidenceSection}>
          <Text style={styles.sectionLabel}>Reasons</Text>
          {confidenceReasons.map((reason) => (
            <Text key={reason} style={styles.reasonText}>
              • {reason}
            </Text>
          ))}
        </View>
      ) : null}
      <View style={styles.verifyRow}>
        <Pressable
          style={[styles.verifyButton, { borderColor: theme.accent }]}
          onPress={async () => {
            try {
              await verifyDeal(coupon.id);
              setStatus('community_verified');
              Alert.alert('Thanks!', 'We recorded that it worked.');
            } catch {
              Alert.alert('Oops', 'Unable to verify right now.');
            }
          }}
        >
          <Text style={[styles.buttonText, { color: theme.accent }]}>Verify works</Text>
        </Pressable>
        <Pressable
          style={[styles.verifyButton, { borderColor: theme.danger }]}
          onPress={async () => {
            try {
              await reportDeal(coupon.id);
              setStatus('reported');
              Alert.alert('Reported', 'Thanks for flagging this.');
            } catch {
              Alert.alert('Oops', 'Unable to report right now.');
            }
          }}
        >
          <Text style={[styles.buttonText, { color: theme.danger }]}>Report</Text>
        </Pressable>
      </View>
      {status === 'reported' ? (
        <Text style={styles.statusText}>This deal has been reported by the community.</Text>
      ) : null}
    </View>
  );
};

export default DetailScreen;
