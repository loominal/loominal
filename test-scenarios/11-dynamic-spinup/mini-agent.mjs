#!/usr/bin/env node
/**
 * Mini Test Agent - Simulates a real agent spawned by spin-up
 *
 * This script:
 * 1. Connects to NATS
 * 2. Registers in the agent-registry KV bucket
 * 3. Waits briefly (simulating work readiness)
 * 4. Deregisters and exits
 *
 * Environment variables:
 * - NATS_URL: NATS server URL (default: nats://localhost:4222)
 * - AGENT_GUID: Agent GUID (auto-generated if not provided)
 * - AGENT_HANDLE: Agent handle (default: mini-agent-{timestamp})
 * - AGENT_CAPABILITY: Capability to register (default: spinup-e2e-test)
 * - PROJECT_ID: Project ID (default: spinup-e2e-project)
 * - STAY_ALIVE_MS: How long to stay registered (default: 10000)
 */

import { connect } from 'nats';
import { randomUUID } from 'crypto';
import { hostname } from 'os';

const NATS_URL = process.env.NATS_URL || 'nats://localhost:4222';
const AGENT_GUID = process.env.AGENT_GUID || randomUUID();
const AGENT_HANDLE = process.env.AGENT_HANDLE || `mini-agent-${Date.now()}`;
const AGENT_CAPABILITY = process.env.AGENT_CAPABILITY || 'spinup-e2e-test';
const PROJECT_ID = process.env.PROJECT_ID || 'spinup-e2e-project';
const STAY_ALIVE_MS = parseInt(process.env.STAY_ALIVE_MS || '10000', 10);

async function main() {
  console.log(`[mini-agent] Starting...`);
  console.log(`[mini-agent] GUID: ${AGENT_GUID}`);
  console.log(`[mini-agent] Handle: ${AGENT_HANDLE}`);
  console.log(`[mini-agent] Capability: ${AGENT_CAPABILITY}`);
  console.log(`[mini-agent] NATS URL: ${NATS_URL}`);

  let nc;

  try {
    // Connect to NATS
    nc = await connect({ servers: [NATS_URL] });
    console.log(`[mini-agent] Connected to NATS`);

    // Get KV bucket
    const js = nc.jetstream();
    let kv;

    try {
      kv = await js.views.kv('agent-registry');
    } catch (err) {
      // Create bucket if it doesn't exist
      const jsm = await nc.jetstreamManager();
      await jsm.streams.add({
        name: 'KV_agent-registry',
        subjects: ['$KV.agent-registry.>'],
        storage: 'file',
        max_age: 24 * 60 * 60 * 1_000_000_000,
        allow_rollup_hdrs: true,
        deny_delete: true,
        deny_purge: false,
        allow_direct: true,
      });
      kv = await js.views.kv('agent-registry');
    }

    // Create agent entry
    const entry = {
      guid: AGENT_GUID,
      handle: AGENT_HANDLE,
      agentType: 'mini-agent',
      hostname: hostname(),
      projectId: PROJECT_ID,
      natsUrl: NATS_URL,
      capabilities: [AGENT_CAPABILITY],
      scope: 'project',
      visibility: 'project-only',
      status: 'online',
      currentTaskCount: 0,
      registeredAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
    };

    // Register
    await kv.put(AGENT_GUID, JSON.stringify(entry));
    console.log(`[mini-agent] Registered in agent-registry`);

    // Stay alive for specified time
    console.log(`[mini-agent] Staying alive for ${STAY_ALIVE_MS}ms...`);
    await new Promise(resolve => setTimeout(resolve, STAY_ALIVE_MS));

    // Update heartbeat before exiting
    entry.lastHeartbeat = new Date().toISOString();
    await kv.put(AGENT_GUID, JSON.stringify(entry));

    // Deregister (mark offline)
    entry.status = 'offline';
    await kv.put(AGENT_GUID, JSON.stringify(entry));
    console.log(`[mini-agent] Deregistered (marked offline)`);

    // Close connection
    await nc.drain();
    console.log(`[mini-agent] Disconnected from NATS`);
    console.log(`[mini-agent] Exiting normally`);

  } catch (err) {
    console.error(`[mini-agent] Error: ${err.message}`);
    if (nc) {
      await nc.close();
    }
    process.exit(1);
  }
}

main();
