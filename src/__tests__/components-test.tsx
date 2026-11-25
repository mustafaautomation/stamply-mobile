import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { QrMark } from '@/components/QrMark';
import { StampGrid } from '@/components/StampGrid';
import { Button } from '@/components/ui';

describe('stamp grid', () => {
  it('exposes progress to assistive tech', async () => {
    await render(<StampGrid filled={5} total={8} />);
    expect(screen.getByLabelText('5 of 8 stamps')).toBeTruthy();
  });
});

describe('qr mark', () => {
  it('renders a personal code', async () => {
    await render(<QrMark value="https://stamply-app.quvantic.com/c/stmp_lina_espresso" />);
    expect(screen.getByLabelText('Personal QR code')).toBeTruthy();
  });
});

describe('button', () => {
  it('runs its action', async () => {
    const onPress = jest.fn();
    await render(<Button label="Add stamp" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Add stamp' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
