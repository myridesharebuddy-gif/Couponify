import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../theme';

type CardPanelProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

const CardPanel = ({ children, style }: CardPanelProps) => {
  const theme = useTheme();
  return (
    <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12
  }
});

export default CardPanel;
