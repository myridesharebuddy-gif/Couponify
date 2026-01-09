import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import GoldButton from './GoldButton';
import { useTheme } from '../theme';

type BarcodeScannerModalProps = {
  visible: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
};

const BarcodeScannerModal = ({ visible, onClose, onScan }: BarcodeScannerModalProps) => {
  const theme = useTheme();
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = Camera.useCameraPermissions();

  useEffect(() => {
    if (visible) {
      requestPermission();
      setScanned(false);
    }
  }, [visible, requestPermission]);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    onScan(data);
  };

  const isGranted = permission?.status === 'granted';

  return (
    <Modal visible={visible} animationType="slide">
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.cameraContainer}>
          {!permission ? (
            <ActivityIndicator color={theme.accent} size="large" />
          ) : isGranted ? (
            <Camera
              style={StyleSheet.absoluteFill}
              type={CameraType.back}
              onBarCodeScanned={handleBarCodeScanned}
              barCodeScannerSettings={{ barCodeTypes: [Camera.Constants.BarCodeType.qr] }}
            />
          ) : (
            <View style={styles.permissionPrompt}>
              <Text style={[styles.permissionText, { color: theme.text }]}>
                Camera permission is required to scan coupons. Please grant access and try again.
              </Text>
              <GoldButton title="Retry permission" onPress={requestPermission} />
            </View>
          )}
        </View>
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.text }]}>
            {scanned
              ? 'Code captured. Tap "Scan again" to rescan or close to continue.'
              : 'Point the camera at a barcode to capture the coupon code.'}
          </Text>
          <GoldButton
            title="Scan again"
            onPress={() => setScanned(false)}
            disabled={!isGranted}
            style={styles.scanAgainButton}
          />
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={[styles.closeText, { color: theme.text }]}>Close scanner</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  cameraContainer: {
    flex: 1,
    borderRadius: 18,
    margin: 16,
    overflow: 'hidden',
    backgroundColor: '#111'
  },
  permissionPrompt: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    alignItems: 'center'
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 16,
    alignItems: 'center'
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12
  },
  scanAgainButton: {
    marginBottom: 12,
    width: '100%'
  },
  closeButton: {
    paddingVertical: 8
  },
  closeText: {
    fontSize: 14,
    textDecorationLine: 'underline'
  }
});

export default BarcodeScannerModal;
