import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Field, Screen, T } from '@/components/ui';
import type { DemoPersona } from '@/domain/types';
import { RepositoryError } from '@/domain/types';
import { useApp } from '@/state/AppProvider';
import { useTheme } from '@/theme/theme';

const PERSONAS: { id: DemoPersona; name: string; detail: string; testID: string }[] = [
  { id: 'lina', name: 'Lina Chen', detail: 'Customer at Harbor & Rye and Northline Bakery', testID: 'demo-lina' },
  { id: 'omar', name: 'Omar Haddad', detail: 'Staff at Harbor & Rye · PIN 2468', testID: 'demo-omar' },
  { id: 'elena', name: 'Elena Voss', detail: 'Owner at Northline Bakery · PIN 8021', testID: 'demo-elena' },
];

export default function SignInScreen() {
  const { session, repo, enterDemo, requestMagicLink, verifyMagicLink, pendingPath, setPendingPath } = useApp();
  const { colors } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) {
    return <Redirect href={(pendingPath ?? '/(tabs)') as never} />;
  }

  const finish = () => {
    const next = pendingPath ?? '/(tabs)';
    setPendingPath(null);
    router.replace(next as never);
  };

  return (
    <Screen testID="sign-in-screen">
      <View style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: colors.stamp, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.stamp }} />
      </View>
      <T variant="display" testID="welcome-title">
        Every visit, one stamp closer.
      </T>
      <T variant="muted">Stamply keeps a merchant’s punch card in your pocket and a calm counter for the people pouring the coffee.</T>

      {!sent ? (
        <View style={{ gap: 12 }}>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@cafe.com"
            keyboardType="email-address"
            testID="email-input"
          />
          {error ? <T color={colors.danger}>{error}</T> : null}
          <Button
            testID="send-magic-link"
            label={busy ? 'Sending…' : 'Email me a sign-in code'}
            disabled={busy}
            onPress={() => {
              setBusy(true);
              setError(null);
              void requestMagicLink(email)
                .then((result) => {
                  setDevCode(result.devCode);
                  setSent(true);
                })
                .catch((err: unknown) => setError(err instanceof RepositoryError ? err.message : 'Could not send the code.'))
                .finally(() => setBusy(false));
            }}
          />
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <T>Check {email.trim().toLowerCase()} for a six-digit code.</T>
          {devCode ? (
            <T testID="magic-code">Demo inbox code {devCode}</T>
          ) : (
            <T variant="muted">Open the link in the email, or type the code from it.</T>
          )}
          <Field label="Code" value={code} onChangeText={setCode} keyboardType="number-pad" testID="code-input" maxLength={6} />
          {error ? <T color={colors.danger}>{error}</T> : null}
          <Button
            testID="verify-code"
            label={busy ? 'Checking…' : 'Continue'}
            disabled={busy}
            onPress={() => {
              setBusy(true);
              setError(null);
              void verifyMagicLink(email, code)
                .then(finish)
                .catch((err: unknown) => setError(err instanceof RepositoryError ? err.message : 'Could not verify that code.'))
                .finally(() => setBusy(false));
            }}
          />
          <Button label="Use a different email" variant="ghost" onPress={() => { setSent(false); setCode(''); setError(null); }} />
        </View>
      )}

      {repo?.mode === 'mock' ? (
        <View style={{ gap: 10 }}>
          <T variant="kicker">Or</T>
          <T variant="title">Try the demo</T>
          {PERSONAS.map((persona) => (
            <Pressable
              key={persona.id}
              testID={persona.testID}
              accessibilityRole="button"
              accessibilityLabel={`Try the demo as ${persona.name}`}
              onPress={() => {
                void enterDemo(persona.id).then(finish);
              }}
              style={{ backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 4 }}
            >
              <T variant="label">{persona.name}</T>
              <T variant="muted">{persona.detail}</T>
            </Pressable>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
