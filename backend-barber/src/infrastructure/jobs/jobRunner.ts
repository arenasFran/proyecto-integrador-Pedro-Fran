import mongoose from 'mongoose';

const JOB_LOCK_TTL = 60_000;

async function acquireLock(jobName: string, instanceId: string): Promise<boolean> {
  const collection = mongoose.connection.collection('job_locks');
  try {
    const result = await collection.findOneAndUpdate(
      { name: jobName, lockedUntil: { $lt: new Date() } },
      { $set: { name: jobName, instanceId, lockedUntil: new Date(Date.now() + JOB_LOCK_TTL) } },
      { upsert: true, returnDocument: 'after' }
    );
    return result?.instanceId === instanceId;
  } catch {
    return false;
  }
}

function getInstanceId(): string {
  return `${process.env.HOSTNAME || 'unknown'}_${process.pid}`;
}

export function createJob(name: string, fn: () => Promise<void>, intervalMs: number): void {
  const instanceId = getInstanceId();

  const run = async () => {
    const locked = await acquireLock(name, instanceId);
    if (!locked) {
      console.log(`[JOBS] Instancia ${instanceId} no adquirió lock para "${name}" — otra instancia lo está ejecutando.`);
      return;
    }
    try {
      await fn();
    } catch (error) {
      console.error(`[JOBS] Error en job "${name}":`, error);
    }
  };

  run();
  setInterval(run, intervalMs);
  console.log(`[JOBS] Job "${name}" registrado (cada ${intervalMs}ms, instancia ${instanceId})`);
}
