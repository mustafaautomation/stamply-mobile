import AsyncStorage from '@react-native-async-storage/async-storage';

import { MockRepository } from '@/data/mockRepository';
import type { StamplyRepository } from '@/data/repository';
import { readPublicEnv, SupabaseRepository } from '@/data/supabaseRepository';

export async function createAppRepository(): Promise<StamplyRepository> {
  const env = readPublicEnv();
  if (env) return new SupabaseRepository(env.url, env.anonKey);
  return MockRepository.hydrate(AsyncStorage);
}

export { readPublicEnv };
