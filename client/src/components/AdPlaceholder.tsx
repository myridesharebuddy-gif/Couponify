import React, { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme, Theme } from '../theme';
import { scaleFont } from '../theme/fontScale';
import CardPanel from './CardPanel';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    panel: {
      marginVertical: 6,
      minHeight: 94,
      justifyContent: 'center'
    },
    title: {
      color: theme.text,
      fontFamily: theme.typography.headingBold,
      fontSize: scaleFont(18)
    },
    sub: {
      color: theme.muted,
      fontSize: scaleFont(12),
      marginTop: 4,
      fontFamily: theme.typography.body
    }
  });

const AdPlaceholder = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <CardPanel style={styles.panel}>
      <Text style={styles.title}>Ad slot (placeholder)</Text>
      <Text style={styles.sub}>Configured for future ad networks</Text>
    </CardPanel>
  );
};

export default AdPlaceholder;
