import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable
} from 'react-native';
import { useFilterStore } from '../store/filterStore';
import { useSearchHistoryStore } from '../store/searchHistoryStore';
import { useTheme, Theme } from '../theme';
import GoldButton from '../components/GoldButton';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      padding: 16
    },
    section: {
      marginBottom: 20
    },
    input: {
      borderRadius: 10,
      borderColor: theme.border,
      borderWidth: 1,
      padding: 12,
      color: '#000',
      backgroundColor: theme.inputBackground,
      fontFamily: theme.typography.body,
      fontSize: 18
    },
    button: {
      marginTop: 12
    },
    label: {
      color: theme.subtext,
      marginBottom: 6,
      fontFamily: theme.typography.body
    },
    empty: {
      color: theme.muted,
      fontFamily: theme.typography.body
    },
    historyRow: {
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.border
    },
    historyText: {
      color: theme.text,
      fontFamily: theme.typography.body
    }
  });

const SearchScreen = () => {
  const [input, setInput] = useState('');
  const { setQuery } = useFilterStore();
  const { history, load, add } = useSearchHistoryStore();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = () => {
    setQuery(input);
    add(input);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Search deals"
          placeholderTextColor="#000"
          style={styles.input}
          onSubmitEditing={submit}
        />
        <GoldButton title="Apply" onPress={submit} style={styles.button} />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Recent searches</Text>
        {history.length === 0 ? (
          <Text style={styles.empty}>No history yet</Text>
        ) : (
          history.map((value) => (
            <Pressable key={value} onPress={() => setInput(value)} style={styles.historyRow}>
              <Text style={styles.historyText}>{value}</Text>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
};

export default SearchScreen;
