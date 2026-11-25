import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, T } from '@/components/ui';

export function ScanCamera({ onScan }: { onScan: (data: string) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);

  if (!permission) {
    return <T variant="muted">Checking the camera…</T>;
  }
  if (!permission.granted) {
    return (
      <View style={{ gap: 10 }}>
        <T variant="muted">Allow the camera so the counter can read a customer QR. You can still type the code.</T>
        <Button label="Allow camera" onPress={() => void requestPermission()} />
      </View>
    );
  }
  return (
    <View style={{ height: 280, borderRadius: 20, overflow: 'hidden' }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={
          locked
            ? undefined
            : ({ data }) => {
                setLocked(true);
                onScan(data);
              }
        }
      />
    </View>
  );
}
