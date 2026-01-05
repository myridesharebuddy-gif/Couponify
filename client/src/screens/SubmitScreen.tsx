import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Pressable } from 'react-native';
import { submitUserCoupon } from '../services/api';
import { useTheme, Theme } from '../theme';
import ThemedScreen from '../components/ThemedScreen';
import GoldButton from '../components/GoldButton';
import SectionTitle from '../components/SectionTitle';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import { useScannedCouponStore } from '../store/scannedCouponStore';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    input: {
      backgroundColor: theme.inputBackground,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      color: '#000',
      borderWidth: 1,
      borderColor: theme.border,
      fontFamily: theme.typography.body,
      fontSize: 18
    },
    formGroup: {
      marginBottom: 12
    }
  });

const capitalizeWords = (input: string) =>
  input
    .split(' ')
    .map((segment) => {
      if (!segment) return '';
      return segment[0].toUpperCase() + segment.slice(1).toLowerCase();
    })
    .join(' ');

const SubmitScreen = () => {
  const [storeWebsite, setStoreWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [scannerVisible, setScannerVisible] = useState(false);
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const addScannedCoupon = useScannedCouponStore((state) => state.addScannedCoupon);

  const handleSubmit = async () => {
    if (!storeWebsite) {
      return Alert.alert('Store/website required', 'Please provide the store or website URL.');
    }
    if (!code) return Alert.alert('Code required', 'Please provide a code.');
    try {
      await submitUserCoupon({
        website: storeWebsite,
        code,
        deal: description || `Promo code for ${storeWebsite}`,
        notes: description || undefined
      });
      Alert.alert('Submitted', 'Your coupon is added as unverified.');
      setDescription('');
      setCode('');
      setStoreWebsite('');
    } catch (error) {
      Alert.alert('Submission failed', 'Please try again later.');
    }
  };

  return (
    <ThemedScreen contentStyle={{ paddingBottom: 32 }}>
      <SectionTitle>Post a coupon</SectionTitle>
      <GoldButton title="Scan barcode" onPress={() => setScannerVisible(true)} style={{ marginBottom: 12 }} />
      <TextInput
        placeholder="Store website or name"
        placeholderTextColor="#000"
        style={styles.input}
        value={storeWebsite}
        onChangeText={setStoreWebsite}
      />
      <TextInput
        placeholder="Describe the deal (optional)"
        placeholderTextColor="#000"
        style={styles.input}
        value={description}
        onChangeText={(value) => setDescription(capitalizeWords(value))}
      />
      <TextInput placeholder="Code" placeholderTextColor="#000" style={styles.input} value={code} onChangeText={setCode} />
      <GoldButton title="Submit coupon" onPress={handleSubmit} />
      <BarcodeScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={(scannedCode) => {
          setScannerVisible(false);
          setCode(scannedCode);
          addScannedCoupon({ code: scannedCode, storeName: storeWebsite || 'scanned coupon' });
          Alert.alert('Code captured', 'We added the scanned coupon to your list.');
        }}
      />
    </ThemedScreen>
  );
};

export default SubmitScreen;
