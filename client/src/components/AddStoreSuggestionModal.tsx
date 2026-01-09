import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  SafeAreaView,
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator
} from 'react-native';
import GoldButton from './GoldButton';
import { useTheme, Theme } from '../theme';
import { scaleFont } from '../theme/fontScale';
import { submitStoreSuggestion } from '../services/api';
import { useDeviceHash } from '../utils/deviceHash';

type Props = {
  visible: boolean;
  onClose: () => void;
  defaultName?: string;
  defaultWebsite?: string;
  onSuccess?: () => void;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      padding: 16
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16
    },
    title: {
      color: theme.text,
      fontSize: scaleFont(18),
      fontFamily: theme.typography.heading
    },
    close: {
      color: theme.accent,
      fontSize: scaleFont(16)
    },
    input: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      padding: 12,
      color: '#000',
      fontFamily: theme.typography.body,
      marginBottom: 12,
      fontSize: 18
    },
    helperRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12
    },
    helperLabel: {
      color: theme.subtext,
      fontFamily: theme.typography.body,
      fontSize: scaleFont(12)
    },
    errorText: {
      color: theme.danger,
      fontFamily: theme.typography.body,
      marginTop: 8
    },
    successText: {
      color: theme.success,
      fontFamily: theme.typography.bodySemiBold,
      marginTop: 8
    },
    spinner: {
      marginVertical: 12
    }
  });

const AddStoreSuggestionModal = ({ visible, onClose, defaultName, defaultWebsite, onSuccess }: Props) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [name, setName] = useState(defaultName ?? '');
  const [website, setWebsite] = useState(defaultWebsite ?? '');
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  const deviceHash = useDeviceHash();

  useEffect(() => {
    if (visible) {
      setName(defaultName ?? '');
      setWebsite(defaultWebsite ?? '');
      setKeyword('');
      setStatus('idle');
      setError(null);
    }
  }, [visible, defaultName, defaultWebsite]);

  const submitting = status === 'submitting';
  const disabled = submitting || status === 'success';

  const validateWebsite = (value: string) => {
    if (!/^https?:\/\//i.test(value)) return false;
    const stripped = value.replace(/^https?:\/\//i, '');
    if (!stripped || stripped.includes('localhost') || !stripped.includes('.')) return false;
    return true;
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedWebsite = website.trim();
    if (trimmedName.length < 2) {
      setError('Store name must be at least 2 characters');
      return;
    }
    if (!validateWebsite(trimmedWebsite)) {
      setError('Use a real http:// or https:// website');
      return;
    }
    if (!deviceHash) {
      setError('Preparing device identifier…');
      return;
    }
    setStatus('submitting');
    setError(null);
    try {
      const result = await submitStoreSuggestion({
        name: trimmedName,
        website: trimmedWebsite,
        keyword: keyword.trim() || undefined,
        deviceHash
      });
      if (result.exists) {
        setStatus('idle');
        setError('Store already exists or is pending review.');
        return;
      }
      setStatus('success');
      onSuccess?.();
    } catch (submissionError) {
      setStatus('idle');
      setError((submissionError as Error).message);
    }
  };

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Suggest a store</Text>
          <Pressable onPress={onClose}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>
        <TextInput
          placeholder="Store name"
          placeholderTextColor="#000"
          style={styles.input}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          placeholder="Website (https://example.com)"
          placeholderTextColor="#000"
          style={styles.input}
          value={website}
          onChangeText={setWebsite}
          autoCapitalize="none"
          keyboardType="url"
        />
        <TextInput
          placeholder="Keyword (optional)"
          placeholderTextColor="#000"
          style={styles.input}
          value={keyword}
          onChangeText={setKeyword}
        />
        <View style={styles.helperRow}>
          <Text style={styles.helperLabel}>We’ll review it soon.</Text>
          <Text style={styles.helperLabel}>{name.trim().length < 2 ? 'Name required' : ''}</Text>
        </View>
        <GoldButton title="Submit suggestion" onPress={handleSubmit} disabled={disabled} />
        {submitting && <ActivityIndicator color={theme.accent} style={styles.spinner} />}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {status === 'success' ? (
          <Text style={styles.successText}>Thanks! We’ll review your suggestion.</Text>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
};

export default AddStoreSuggestionModal;
