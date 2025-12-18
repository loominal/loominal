#!/usr/bin/env node
/**
 * Phase 8.3: Performance Baseline Tests
 *
 * Measures latency metrics for core operations:
 * - REQ-PERF-001: Channel message round-trip latency
 * - REQ-PERF-002: Work claim latency
 * - REQ-PERF-003: Direct message round-trip latency
 *
 * Prerequisites:
 * - NATS running on localhost:4222
 */

import { setTimeout as sleep } from 'timers/promises';
import { connect, StringCodec } from 'nats';
import { randomUUID } from 'crypto';
import { hostname } from 'os';

const NATS_URL = process.env.NATS_URL || 'nats://localhost:4222';

// Percentile calculation
function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil(p / 100 * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function formatStats(latencies) {
  if (latencies.length === 0) {
    return { count: 0, min: 'N/A', max: 'N/A', mean: 'N/A', p50: 'N/A', p95: 'N/A', p99: 'N/A' };
  }
  return {
    count: latencies.length,
    min: Math.min(...latencies).toFixed(2),
    max: Math.max(...latencies).toFixed(2),
    mean: mean(latencies).toFixed(2),
    p50: percentile(latencies, 50).toFixed(2),
    p95: percentile(latencies, 95).toFixed(2),
    p99: percentile(latencies, 99).toFixed(2),
  };
}

async function runTests() {
  console.log('\n=== Phase 8.3: Performance Baseline Tests ===\n');
  console.log(`NATS URL: ${NATS_URL}\n`);

  // Connect to NATS
  let nc;
  try {
    nc = await connect({ servers: NATS_URL });
    console.log('✓ NATS connected\n');
  } catch (err) {
    console.error('ERROR: Cannot connect to NATS:', err.message);
    process.exit(1);
  }

  const sc = StringCodec();
  const js = nc.jetstream();
  const jsm = await nc.jetstreamManager();

  const results = {
    channelLatency: null,
    workClaimLatency: null,
    directMessageLatency: null,
  };

  // ============================================
  // REQ-PERF-001: Channel Message Round-Trip Latency
  // Measures true end-to-end latency with concurrent pub/sub
  // ============================================
  console.log('--- REQ-PERF-001: Channel Message Round-Trip Latency ---\n');
  {
    const streamName = `PERF_CHANNEL_${Date.now()}`;
    const subject = `perf.channel.${Date.now()}`;
    const messageCount = 1000;
    const latencies = [];

    try {
      // Create stream
      await jsm.streams.add({
        name: streamName,
        subjects: [subject],
        max_age: 60 * 1000000000,
      });

      // Create push consumer for real-time delivery
      const consumerName = `perf-consumer-${Date.now()}`;
      const deliverSubject = `deliver.${Date.now()}`;

      await jsm.consumers.add(streamName, {
        durable_name: consumerName,
        deliver_subject: deliverSubject,
        deliver_policy: 'new',
        ack_policy: 'none',  // No ack needed for latency test
      });

      // Track publish times
      const publishTimes = new Map();
      let received = 0;

      // Set up subscriber first
      const done = new Promise((resolve) => {
        const sub = nc.subscribe(deliverSubject, {
          callback: (err, msg) => {
            if (err) return;
            const receiveTime = Date.now();
            try {
              const payload = JSON.parse(sc.decode(msg.data));
              const publishTime = publishTimes.get(payload.id);
              if (publishTime) {
                latencies.push(receiveTime - publishTime);
              }
            } catch (e) {
              // ignore parse errors
            }
            received++;
            if (received >= messageCount) {
              sub.unsubscribe();
              resolve();
            }
          },
        });
      });

      // Small delay for subscription to be ready
      await sleep(50);

      // Publish messages
      console.log(`Publishing ${messageCount} messages with concurrent subscriber...`);
      for (let i = 0; i < messageCount; i++) {
        const msgId = `msg-${i}`;
        const payload = JSON.stringify({ id: msgId, sent: Date.now() });
        publishTimes.set(msgId, Date.now());
        await js.publish(subject, sc.encode(payload));
      }

      // Wait for all messages to be received (with timeout)
      await Promise.race([
        done,
        sleep(10000).then(() => console.log('  Timeout waiting for messages'))
      ]);

      // Cleanup
      await jsm.streams.delete(streamName);

      results.channelLatency = formatStats(latencies);

      console.log('\nChannel Message Round-Trip Latency (ms):');
      console.log(`  Messages: ${results.channelLatency.count}`);
      console.log(`  Min: ${results.channelLatency.min}ms`);
      console.log(`  Max: ${results.channelLatency.max}ms`);
      console.log(`  Mean: ${results.channelLatency.mean}ms`);
      console.log(`  p50: ${results.channelLatency.p50}ms`);
      console.log(`  p95: ${results.channelLatency.p95}ms`);
      console.log(`  p99: ${results.channelLatency.p99}ms`);

      const p95Pass = parseFloat(results.channelLatency.p95) < 100;
      console.log(`\n  Target p95 < 100ms: ${p95Pass ? '✅ PASS' : '❌ FAIL'}`);
    } catch (err) {
      console.error('  Error:', err.message);
    }
  }

  // ============================================
  // REQ-PERF-002: Work Claim Latency
  // Measures time from broadcast to claim
  // ============================================
  console.log('\n--- REQ-PERF-002: Work Claim Latency ---\n');
  {
    const capability = `perf-work-${Date.now()}`;
    const streamName = `WORK_${capability.toUpperCase().replace(/-/g, '_')}`;
    const subject = `work.queue.${capability}`;
    const workCount = 100;
    const latencies = [];

    try {
      // Create work stream
      await jsm.streams.add({
        name: streamName,
        subjects: [subject],
        max_age: 60 * 1000000000,
        retention: 'workqueue',
      });

      // Create consumer for claims
      const consumerName = `perf-worker-${Date.now()}`;
      await jsm.consumers.add(streamName, {
        durable_name: consumerName,
        deliver_policy: 'all',
        ack_policy: 'explicit',
        max_deliver: 1,
      });

      const consumer = await js.consumers.get(streamName, consumerName);

      // Publish work items
      console.log(`Broadcasting ${workCount} work items...`);
      const broadcastTimes = new Map();

      for (let i = 0; i < workCount; i++) {
        const workId = `work-${i}`;
        const workItem = {
          id: workId,
          taskId: `task-${i}`,
          capability: capability,
          description: `Test work ${i}`,
          priority: 5,
          offeredBy: 'perf-test',
          offeredAt: new Date().toISOString(),
          attempts: 0,
        };
        broadcastTimes.set(workId, Date.now());
        await js.publish(subject, sc.encode(JSON.stringify(workItem)));
      }

      console.log('Claiming work items...');

      // Claim work and measure latency
      let claimed = 0;
      const iter = await consumer.fetch({ max_messages: workCount, expires: 10000 });

      for await (const msg of iter) {
        const claimTime = Date.now();
        const workItem = JSON.parse(sc.decode(msg.data));
        const broadcastTime = broadcastTimes.get(workItem.id);
        if (broadcastTime) {
          latencies.push(claimTime - broadcastTime);
        }
        msg.ack();
        claimed++;
        if (claimed >= workCount) break;
      }

      // Cleanup
      await jsm.streams.delete(streamName);

      results.workClaimLatency = formatStats(latencies);

      console.log('\nWork Claim Latency (ms):');
      console.log(`  Work Items: ${results.workClaimLatency.count}`);
      console.log(`  Min: ${results.workClaimLatency.min}ms`);
      console.log(`  Max: ${results.workClaimLatency.max}ms`);
      console.log(`  Mean: ${results.workClaimLatency.mean}ms`);
      console.log(`  p50: ${results.workClaimLatency.p50}ms`);
      console.log(`  p95: ${results.workClaimLatency.p95}ms`);
      console.log(`  p99: ${results.workClaimLatency.p99}ms`);

      const p95Pass = parseFloat(results.workClaimLatency.p95) < 200;
      console.log(`\n  Target p95 < 200ms: ${p95Pass ? '✅ PASS' : '❌ FAIL'}`);
    } catch (err) {
      console.error('  Error:', err.message);
    }
  }

  // ============================================
  // REQ-PERF-003: Direct Message Round-Trip Latency
  // Measures true end-to-end latency with concurrent pub/sub
  // ============================================
  console.log('\n--- REQ-PERF-003: Direct Message Round-Trip Latency ---\n');
  {
    const recipientGuid = randomUUID();
    const streamName = `INBOX_${recipientGuid.replace(/-/g, '_')}`;
    const subject = `global.agent.${recipientGuid}`;
    const messageCount = 500;
    const latencies = [];

    try {
      // Create inbox stream
      await jsm.streams.add({
        name: streamName,
        subjects: [subject],
        max_age: 60 * 1000000000,
      });

      // Create push consumer for real-time delivery
      const consumerName = `inbox-reader-${Date.now()}`;
      const deliverSubject = `deliver.inbox.${Date.now()}`;

      await jsm.consumers.add(streamName, {
        durable_name: consumerName,
        deliver_subject: deliverSubject,
        deliver_policy: 'new',
        ack_policy: 'none',
      });

      // Track send times
      const sendTimes = new Map();
      let received = 0;

      // Set up subscriber first
      const done = new Promise((resolve) => {
        const sub = nc.subscribe(deliverSubject, {
          callback: (err, msg) => {
            if (err) return;
            const receiveTime = Date.now();
            try {
              const message = JSON.parse(sc.decode(msg.data));
              const sendTime = sendTimes.get(message.id);
              if (sendTime) {
                latencies.push(receiveTime - sendTime);
              }
            } catch (e) {
              // ignore parse errors
            }
            received++;
            if (received >= messageCount) {
              sub.unsubscribe();
              resolve();
            }
          },
        });
      });

      // Small delay for subscription to be ready
      await sleep(50);

      // Send direct messages
      console.log(`Sending ${messageCount} direct messages with concurrent subscriber...`);
      for (let i = 0; i < messageCount; i++) {
        const msgId = `dm-${i}`;
        const message = {
          id: msgId,
          senderGuid: 'sender-guid',
          senderHandle: 'sender',
          recipientGuid: recipientGuid,
          messageType: 'text',
          content: `Test message ${i}`,
          timestamp: new Date().toISOString(),
        };
        sendTimes.set(msgId, Date.now());
        await js.publish(subject, sc.encode(JSON.stringify(message)));
      }

      // Wait for all messages to be received (with timeout)
      await Promise.race([
        done,
        sleep(10000).then(() => console.log('  Timeout waiting for messages'))
      ]);

      // Cleanup
      await jsm.streams.delete(streamName);

      results.directMessageLatency = formatStats(latencies);

      console.log('\nDirect Message Round-Trip Latency (ms):');
      console.log(`  Messages: ${results.directMessageLatency.count}`);
      console.log(`  Min: ${results.directMessageLatency.min}ms`);
      console.log(`  Max: ${results.directMessageLatency.max}ms`);
      console.log(`  Mean: ${results.directMessageLatency.mean}ms`);
      console.log(`  p50: ${results.directMessageLatency.p50}ms`);
      console.log(`  p95: ${results.directMessageLatency.p95}ms`);
      console.log(`  p99: ${results.directMessageLatency.p99}ms`);

      const p95Pass = parseFloat(results.directMessageLatency.p95) < 100;
      console.log(`\n  Target p95 < 100ms: ${p95Pass ? '✅ PASS' : '❌ FAIL'}`);
    } catch (err) {
      console.error('  Error:', err.message);
    }
  }

  // Close NATS connection
  await nc.close();

  // ============================================
  // Summary
  // ============================================
  console.log('\n=== Performance Baseline Summary ===\n');

  const allPass =
    results.channelLatency && parseFloat(results.channelLatency.p95) < 100 &&
    results.workClaimLatency && parseFloat(results.workClaimLatency.p95) < 200 &&
    results.directMessageLatency && parseFloat(results.directMessageLatency.p95) < 100;

  console.log('| Metric | p50 | p95 | p99 | Target | Status |');
  console.log('|--------|-----|-----|-----|--------|--------|');

  if (results.channelLatency) {
    const pass = parseFloat(results.channelLatency.p95) < 100;
    console.log(`| Channel Message | ${results.channelLatency.p50}ms | ${results.channelLatency.p95}ms | ${results.channelLatency.p99}ms | p95 < 100ms | ${pass ? 'PASS' : 'FAIL'} |`);
  }

  if (results.workClaimLatency) {
    const pass = parseFloat(results.workClaimLatency.p95) < 200;
    console.log(`| Work Claim | ${results.workClaimLatency.p50}ms | ${results.workClaimLatency.p95}ms | ${results.workClaimLatency.p99}ms | p95 < 200ms | ${pass ? 'PASS' : 'FAIL'} |`);
  }

  if (results.directMessageLatency) {
    const pass = parseFloat(results.directMessageLatency.p95) < 100;
    console.log(`| Direct Message | ${results.directMessageLatency.p50}ms | ${results.directMessageLatency.p95}ms | ${results.directMessageLatency.p99}ms | p95 < 100ms | ${pass ? 'PASS' : 'FAIL'} |`);
  }

  console.log(`\nOverall: ${allPass ? '✅ ALL TARGETS MET' : '❌ SOME TARGETS NOT MET'}`);

  return { results, allPass };
}

runTests()
  .then(({ allPass }) => {
    process.exit(allPass ? 0 : 1);
  })
  .catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
  });
