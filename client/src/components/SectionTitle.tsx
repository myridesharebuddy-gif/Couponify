import React, { ReactNode } from 'react';
import { Text, StyleSheet, StyleProp, TextStyle } from 'react-native';
import { useTheme } from '../theme';
import { scaleFont } from '../theme/fontScale';

type SectionTitleProps = {
  children: ReactNode;
  smallCaps?: boolean;
  style?: StyleProp<TextStyle>;
};

const SectionTitle = ({ children, smallCaps = false, style }: SectionTitleProps) => {
  const theme = useTheme();
  return (
    <Text
      style={[
        styles.title,
        {
          color: theme.text,
          fontFamily: theme.typography.heading,
          letterSpacing: theme.typography.letterSpacing,
          textTransform: smallCaps ? 'uppercase' : 'none',
          textShadowColor: theme.glow,
          textShadowRadius: 4
        },
        style
      ]}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: scaleFont(20),
    marginBottom: 8
  }
});

export default SectionTitle;
