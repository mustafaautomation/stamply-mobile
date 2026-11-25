export interface PushSetup {
  status: 'mocked' | 'granted' | 'denied';
  token: string;
  detail: string;
}
