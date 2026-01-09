import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { scaleFont } from '../theme/fontScale';
import { Ionicons } from '@expo/vector-icons';

const Header = ({
  title,
  onActionPress,
  onActionLongPress,
  actionLongPressDelayMs = 5000
}: {
  title: string;
  onActionPress?: () => void;
  onActionLongPress?: () => void;
  actionLongPressDelayMs?: number;
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const normalizedTitle = title?.trim().toLowerCase();
  const showTitle = normalizedTitle && normalizedTitle !== 'unknown store';
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }
    };
  }, []);

  const startLongPress = () => {
    if (!onActionLongPress) return;
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }
    longPressTriggeredRef.current = false;
    longPressTimeoutRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      onActionLongPress();
    }, actionLongPressDelayMs);
  };

  const clearLongPress = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const handleActionPress = () => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    onActionPress?.();
  };
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          paddingTop: insets.top + 12
        }
      ]}
    >
      <View style={styles.headerRow}>
        {showTitle ? (
          <View
            style={[
              styles.titleWrapper,
              { borderColor: theme.border, shadowColor: theme.ink, backgroundColor: theme.surface }
            ]}
          >
            <Text
              style={[
                styles.title,
                {
                  color: theme.text,
                  fontFamily: theme.typography.heading,
                  textShadowColor: theme.glow,
                  textShadowRadius: 4
                }
              ]}
            >
              {title}
            </Text>
          </View>
        ) : null}
        {onActionPress || onActionLongPress ? (
          <Pressable
            onPress={handleActionPress}
            onPressIn={startLongPress}
            onPressOut={clearLongPress}
            style={[styles.actionButton, styles.actionAbsolute]}
          >
            <Ionicons name="settings-outline" size={22} color={theme.text} />
          </Pressable>
        ) : null}
      </View>
      <Text
        style={[
          styles.disclaimer,
          {
            color: theme.subtext,
            fontFamily: theme.typography.body
          }
        ]}
      >
        Discover the latest coupon codes and savings shared by real people.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    borderBottomWidth: 1
  },
  title: {
    fontSize: scaleFont(26)
  },
  titleWrapper: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignSelf: 'center',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  actionButton: {
    borderRadius: 16,
    padding: 6
  },
  actionAbsolute: {
    position: 'absolute',
    right: 18,
    top: 8
  },
  disclaimer: {
    fontSize: scaleFont(14),
    marginTop: 10,
    letterSpacing: 0.3,
    textAlign: 'center',
    alignSelf: 'center',
    maxWidth: '80%'
  }
});

export default Header;
