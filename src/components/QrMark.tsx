import { useMemo } from 'react';
import { View } from 'react-native';
import QRCode from 'qrcode';

import { useTheme } from '@/theme/theme';

export function QrMark({ value, size = 220, testID = 'customer-qr' }: { value: string; size?: number; testID?: string }) {
  const { colors } = useTheme();
  const cells = useMemo(() => {
    const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
    const count = qr.modules.size;
    const rows: boolean[][] = [];
    for (let y = 0; y < count; y += 1) {
      const row: boolean[] = [];
      for (let x = 0; x < count; x += 1) row.push(qr.modules.get(y, x) === 1);
      rows.push(row);
    }
    return rows;
  }, [value]);
  const quiet = 2;
  const cell = size / (cells.length + quiet * 2);
  return (
    <View
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel="Personal QR code"
      style={{
        width: size,
        height: size,
        backgroundColor: colors.qrBg,
        borderRadius: 20,
        padding: cell * quiet,
        alignSelf: 'center',
        borderWidth: 1,
        borderColor: colors.line,
      }}
    >
      {cells.map((row, y) => (
        <View key={y} style={{ flexDirection: 'row' }}>
          {row.map((on, x) => (
            <View key={x} style={{ width: cell, height: cell, backgroundColor: on ? colors.qr : 'transparent' }} />
          ))}
        </View>
      ))}
    </View>
  );
}
