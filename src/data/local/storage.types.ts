export interface KeyValueStorage {
  get(key: string): Promise<string | null>;
  /** Compare and write atomically, including all product rows. */
  commit(
    values: Record<string, string>,
    removals?: string[],
    expected?: Record<string, string | null>,
  ): Promise<void>;
}

export class StorageConflict extends Error {
  constructor() {
    super('La biblioteca ha cambiado en otra ventana. Revisa los datos y vuelve a intentarlo.');
  }
}
export class StorageUpgradeBlocked extends Error {
  constructor() {
    super(
      'Cierra las otras pestañas de esta app y vuelve a intentarlo para actualizar la biblioteca sin perder datos.',
    );
  }
}
