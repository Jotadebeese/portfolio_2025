import * as migration_20250320_081110 from './20250320_081110';

export const migrations = [
  {
    up: migration_20250320_081110.up,
    down: migration_20250320_081110.down,
    name: '20250320_081110'
  },
];
