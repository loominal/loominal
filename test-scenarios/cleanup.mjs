#!/usr/bin/env node
/**
 * Cleanup script to remove old agent data from NATS KV store
 */

import { connect } from 'nats';

const NATS_URL = process.env.NATS_URL || 'nats://192.168.7.16:4222';
const PROJECT_ID = process.env.PROJECT_ID || '0000000000000001';

async function cleanup() {
  console.log(`Connecting to ${NATS_URL}...`);
  const nc = await connect({ servers: NATS_URL });
  const js = nc.jetstream();

  // Use the shared agent-registry bucket (matches both Warp and Weft)
  const bucketName = 'agent-registry';
  console.log(`\nCleaning up bucket: ${bucketName}`);

  try {
    const kv = await js.views.kv(bucketName);

    // Get all keys
    const keys = await kv.keys();
    const keyList = [];
    for await (const key of keys) {
      keyList.push(key);
    }

    console.log(`Found ${keyList.length} entries:`);

    // List and delete each entry
    for (const key of keyList) {
      const entry = await kv.get(key);
      if (entry && entry.value) {
        try {
          const data = JSON.parse(new TextDecoder().decode(entry.value));
          console.log(`  - ${key}: ${data.handle || 'no-handle'} (${data.status || 'unknown'})`);
        } catch {
          console.log(`  - ${key}: (unable to parse)`);
        }
      }
      await kv.delete(key);
      console.log(`    DELETED`);
    }

    console.log(`\nDeleted ${keyList.length} agent entries.`);
  } catch (err) {
    if (err.message?.includes('bucket not found')) {
      console.log('Bucket does not exist - nothing to clean up.');
    } else {
      throw err;
    }
  }

  // Also clean up any work streams
  const jsm = await nc.jetstreamManager();

  console.log('\nChecking for work streams to purge...');
  const streams = await jsm.streams.list().next();
  for (const stream of streams) {
    if (stream.config.name.includes(PROJECT_ID.replace(/-/g, '_'))) {
      console.log(`  Purging stream: ${stream.config.name}`);
      await jsm.streams.purge(stream.config.name);
    }
  }

  await nc.drain();
  console.log('\nCleanup complete!');
}

cleanup().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
