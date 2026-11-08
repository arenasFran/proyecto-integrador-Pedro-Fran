import { MongoMemoryReplSet } from 'mongodb-memory-server';

declare global {
  // eslint-disable-next-line no-var
  var __MONGO_REPLSET__: MongoMemoryReplSet | undefined;
}

export default async function globalSetup(): Promise<void> {
  process.env.MONGOMS_VERSION = process.env.MONGOMS_VERSION || '7.0.14';

  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });

  const uri = replSet.getUri();
  process.env.INTEGRATION_MONGO_URI = uri;
  process.env.MONGO_URI = uri;

  globalThis.__MONGO_REPLSET__ = replSet;
}
