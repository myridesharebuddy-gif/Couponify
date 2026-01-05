import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { useTheme } from '../theme';
import { scaleFont } from '../theme/fontScale';

type GoldButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

const GoldButton = ({ title, onPress, disabled, style, textStyle }: GoldButtonProps) => {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          borderColor: theme.border,
          opacity: disabled ? 0.4 : 1,
          backgroundColor: pressed ? 'rgba(216, 194, 138, 0.12)' : theme.surface
        },
        style
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: theme.text,
            fontFamily: theme.typography.bodySemiBold,
            textShadowColor: theme.glow,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 4
          },
          textStyle
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }
  },
  text: {
    fontSize: scaleFont(16),
    letterSpacing: 0.6
  }
});

export default GoldButton;
