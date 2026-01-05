import React, { ReactNode } from 'react';
import { SafeAreaView, ScrollView, View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../theme';
import DecoFrame from './DecoFrame';

type ThemedScreenProps = {
  children: ReactNode;
  scrollable?: boolean;
  frame?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

const ThemedScreen = ({ children, scrollable = false, frame = false, style, contentStyle }: ThemedScreenProps) => {
  const theme = useTheme();
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }, style]}>
      <View style={styles.container}>
        {scrollable ? (
          <ScrollView
            contentContainerStyle={[styles.content, contentStyle]}
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, contentStyle]}>{children}</View>
        )}
        {frame && <DecoFrame />}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  container: {
    flex: 1
  },
  content: {
    flex: 1,
    padding: 16
  },
  scroll: {
    flex: 1
  }
});

export default ThemedScreen;
