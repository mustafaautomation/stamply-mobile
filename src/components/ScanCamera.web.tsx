import { T } from '@/components/ui';

export function ScanCamera(_props: { onScan: (data: string) => void }) {
  return (
    <T variant="muted">
      The live camera scanner runs in the iOS and Android app. On the web preview, enter a customer code or pick a demo card.
    </T>
  );
}
