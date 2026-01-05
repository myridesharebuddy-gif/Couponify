import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../theme';
import { scaleFont } from '../theme/fontScale';
import { DealItem } from '../types/coupon';
import { buildShortTitle, extractCode, extractSavings, extractStore } from '../utils/dealSummary';
import { recordDealCopy } from '../services/api';
import { logEvent } from '../lib/analytics';

const getConfidenceBadge = (score: number, theme: ReturnType<typeof useTheme>) => {
  if (score >= 85) {
    return { label: 'High', color: theme.success };
  }
  if (score >= 72) {
    return { label: 'Medium', color: theme.accent };
  }
  return { label: 'Low', color: theme.danger };
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    card: {
      marginVertical: 6,
      padding: 14,
      borderRadius: 18,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.ink,
      shadowOpacity: 0.2,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 }
    },
    pressed: {
      opacity: 0.6
    },
    reported: {
      opacity: 0.4
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    storeText: {
      color: theme.text,
      fontFamily: theme.typography.heading,
      fontSize: scaleFont(16)
    },
    savingsBadge: {
      borderWidth: 1,
      borderColor: theme.accent,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4
    },
    savingsText: {
      fontSize: scaleFont(12),
      color: theme.accent,
      fontFamily: theme.typography.bodySemiBold
    },
    title: {
      marginTop: 6,
      color: theme.text,
      fontSize: scaleFont(18),
      fontFamily: theme.typography.heading,
      lineHeight: scaleFont(24)
    },
    confidencePill: {
      marginTop: 8,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 4,
      alignSelf: 'flex-start'
    },
    confidenceText: {
      fontSize: scaleFont(12),
      fontFamily: theme.typography.bodySemiBold
    },
    metaRow: {
      marginTop: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    sourceText: {
      color: theme.subtext,
      fontSize: scaleFont(12),
      fontFamily: theme.typography.body
    },
    copyButton: {
      marginLeft: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderColor: theme.accent,
      borderWidth: 1,
      borderRadius: 10
    },
    copyButtonText: {
      color: theme.accent,
      fontSize: scaleFont(12),
      fontFamily: theme.typography.bodySemiBold
    },
    noCodeText: {
      color: theme.muted,
      fontSize: scaleFont(12),
      fontFamily: theme.typography.body
    },
    feedbackText: {
      marginTop: 8,
      color: theme.accent,
      fontSize: scaleFont(12),
      fontFamily: theme.typography.bodySemiBold
    },
    statusText: {
      marginTop: 6,
      color: theme.danger,
      fontSize: scaleFont(12),
      fontFamily: theme.typography.bodySemiBold
    }
  });

const DealCard = ({ coupon, onPress }: { coupon: DealItem; onPress?: () => void }) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const code = extractCode(coupon);
  const savings = extractSavings(coupon);
  const shortTitle = buildShortTitle(coupon);
  const confidence = getConfidenceBadge(coupon.confidenceScore, theme);
  const isReported = coupon.status === 'reported';

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const showFeedback = (message: string) => {
    setFeedback(message);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => setFeedback(null), 1400);
  };

  const handleCopy = async () => {
    if (!code) {
      return;
    }
    await Clipboard.setStringAsync(code);
    logEvent({ couponId: coupon.id, eventType: 'coupon_copy' });
    recordDealCopy(coupon.id).catch(() => {});
    showFeedback('Copied!');
  };

  const handlePress = () => {
    logEvent({ couponId: coupon.id, eventType: 'coupon_open' });
    onPress?.();
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
        isReported && styles.reported
      ]}
      onPress={handlePress}
      onLongPress={code ? handleCopy : undefined}
    >
      <View style={styles.row}>
        <Text style={styles.storeText} numberOfLines={1}>
          {extractStore(coupon)}
        </Text>
        {savings ? (
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>{savings}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {shortTitle}
      </Text>
      <View style={[styles.confidencePill, { borderColor: confidence.color }]}>
        <Text style={[styles.confidenceText, { color: confidence.color }]}>
          {confidence.label} confidence · {Math.round(coupon.confidenceScore)}
        </Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.sourceText} numberOfLines={1}>
          {coupon.source}
        </Text>
        {code ? (
          <Pressable style={styles.copyButton} onPress={handleCopy}>
            <Text style={styles.copyButtonText}>Copy code</Text>
          </Pressable>
        ) : (
          <Text style={styles.noCodeText}>No code required</Text>
        )}
      </View>
      {feedback ? <Text style={styles.feedbackText}>{feedback}</Text> : null}
      {isReported ? <Text style={styles.statusText}>Reported by the community</Text> : null}
    </Pressable>
  );
};

export default DealCard;
