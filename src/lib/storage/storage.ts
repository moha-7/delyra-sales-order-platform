export type PutFileInput = {
  bytes: Uint8Array;
  originalName: string;
  entityType: string;
  entityId: string;
};

export type StoreFileInput = PutFileInput;

export type StoredFile = {
  storageKey: string;
  sizeBytes: number;
  checksumSha256: string;
};

export interface StorageDriver {
  put(input: PutFileInput): Promise<StoredFile>;
  read(storageKey: string): Promise<Uint8Array>;
  delete(storageKey: string): Promise<void>;
}
