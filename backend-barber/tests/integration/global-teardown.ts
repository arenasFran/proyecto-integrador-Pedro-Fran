import { MongoMemoryReplSet } from 'mongodb-memory-server';

declare global {
  // eslint-disable-next-line no-var
  var __MONGO_REPLSET__: MongoMemoryReplSet | undefined;
}

export default async function globalTeardown(): Promise<void> {
  const replSet = globalThis.__MONGO_REPLSET__;
  if (replSet) {
    await replSet.stop();
  }
}
