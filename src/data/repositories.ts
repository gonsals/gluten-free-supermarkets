import { Platform } from 'react-native';
import { config } from '@/src/shared/config';
import { LibraryRepository } from './local/library';
import { storage } from './local/storage';
import { createProductClient } from './open-food-facts/client';

export const library = new LibraryRepository(storage, config.offEnvironment);
export const productClient = createProductClient({
  environment: config.offEnvironment,
  native: Platform.OS !== 'web',
});
