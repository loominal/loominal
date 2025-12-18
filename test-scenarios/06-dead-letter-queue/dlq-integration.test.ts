/**
 * Integration tests for Dead Letter Queue (REQ-DLQ)
 * These tests verify P0 Beta-blocking requirements
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectToNats, disconnect, getJetStreamManager } from '../../warp/src/nats.js';
import {
  createDLQStream,
  moveToDeadLetter,
  listDeadLetterItems,
  retryDeadLetterItem,
  discardDeadLetterItem,
} from '../../warp/src/dlq.js';
import {
  createWorkQueueStream,
  publishWorkItem,
  subscribeToWorkQueue,
} from '../../warp/src/workqueue.js';
import type { WorkItem } from '../../warp/src/types.js';

const TEST_NATS_URL = process.env.NATS_URL || 'nats://localhost:4222';
const testRunId = Date.now().toString(16).slice(-8);
let uuidCounter = 0;

function createTestWorkItem(capability: string): WorkItem {
  const counter = uuidCounter++;
  const counterHex = counter.toString(16).padStart(4, '0');
  const id = `550e8400-e29b-41d4-a716-${testRunId}${counterHex}`;

  return {
    id,
    taskId: `dlq-test-${Date.now()}-${counter}`,
    capability,
    description: `DLQ integration test work item ${counter}`,
    priority: 5,
    offeredBy: 'test-agent-dlq',
    offeredAt: new Date().toISOString(),
    attempts: 0,
  };
}

describe('REQ-DLQ: Dead Letter Queue Integration Tests', () => {
  beforeAll(async () => {
    await connectToNats(TEST_NATS_URL);
    await createDLQStream();
  });

  afterAll(async () => {
    await disconnect();
  });

  beforeEach(async () => {
    // Clean up DLQ before each test
    const items = await listDeadLetterItems();
    for (const item of items) {
      try {
        await discardDeadLetterItem(item.id);
      } catch (err) {
        // Item might already be deleted, ignore
      }
    }
  });

  describe('REQ-DLQ-001: Work moves to DLQ after max delivery attempts', () => {
    it('should move work to DLQ after 3 failed attempts', async () => {
      const startTime = Date.now();
      const workItem = createTestWorkItem('dlq-test-001');
      workItem.attempts = 3; // Simulate 3 failed attempts

      // Move to DLQ
      await moveToDeadLetter(workItem, 'Max delivery attempts exceeded (3)');

      // Verify work item appears in DLQ
      const dlqItems = await listDeadLetterItems();
      const foundItem = dlqItems.find((item) => item.id === workItem.id);

      expect(foundItem).toBeDefined();
      expect(foundItem?.workItem.id).toBe(workItem.id);
      expect(foundItem?.workItem.taskId).toBe(workItem.taskId);
      expect(foundItem?.attempts).toBe(3);
      expect(foundItem?.reason).toContain('Max delivery attempts');

      const duration = Date.now() - startTime;
      console.log(`REQ-DLQ-001: PASS - Work moved to DLQ in ${duration}ms`);
    });

    it('should preserve original work item metadata in DLQ', async () => {
      const workItem = createTestWorkItem('dlq-test-001-metadata');
      workItem.attempts = 3;
      workItem.priority = 8;
      workItem.contextData = { testKey: 'testValue', nested: { data: 123 } };

      await moveToDeadLetter(workItem, 'Test failure');

      const dlqItems = await listDeadLetterItems();
      const foundItem = dlqItems.find((item) => item.id === workItem.id);

      expect(foundItem?.workItem.priority).toBe(8);
      expect(foundItem?.workItem.contextData).toEqual({ testKey: 'testValue', nested: { data: 123 } });
    });
  });

  describe('REQ-DLQ-002: list_dead_letter_items returns correct data', () => {
    it('should list all DLQ items with correct fields', async () => {
      const startTime = Date.now();

      // Create 3 failed work items
      const items = [
        createTestWorkItem('typescript'),
        createTestWorkItem('python'),
        createTestWorkItem('testing'),
      ];

      for (const item of items) {
        item.attempts = 3;
        await moveToDeadLetter(item, `Failure for ${item.taskId}`, [
          'Error 1',
          'Error 2',
          'Error 3',
        ]);
      }

      // List DLQ items
      const dlqItems = await listDeadLetterItems();

      // Verify all 3 items are present
      expect(dlqItems.length).toBeGreaterThanOrEqual(3);

      // Check each item has required fields
      const ourItems = dlqItems.filter((item) =>
        items.some((workItem) => workItem.id === item.id)
      );

      expect(ourItems.length).toBe(3);

      for (const dlqItem of ourItems) {
        expect(dlqItem).toHaveProperty('id');
        expect(dlqItem).toHaveProperty('workItem');
        expect(dlqItem).toHaveProperty('reason');
        expect(dlqItem).toHaveProperty('attempts');
        expect(dlqItem).toHaveProperty('failedAt');
        expect(dlqItem).toHaveProperty('errors');

        expect(dlqItem.workItem).toHaveProperty('taskId');
        expect(dlqItem.workItem).toHaveProperty('description');
        expect(dlqItem.workItem).toHaveProperty('capability');
        expect(dlqItem.attempts).toBe(3);
        expect(dlqItem.errors).toHaveLength(3);
      }

      const duration = Date.now() - startTime;
      console.log(`REQ-DLQ-002: PASS - Listed ${ourItems.length} DLQ items in ${duration}ms`);
    });

    it('should filter DLQ items by capability', async () => {
      const tsItem = createTestWorkItem('typescript');
      const pyItem = createTestWorkItem('python');

      tsItem.attempts = 3;
      pyItem.attempts = 3;

      await moveToDeadLetter(tsItem, 'TS failure');
      await moveToDeadLetter(pyItem, 'Python failure');

      // Filter by typescript
      const tsItems = await listDeadLetterItems({ capability: 'typescript' });
      const foundTs = tsItems.find((item) => item.id === tsItem.id);
      const foundPy = tsItems.find((item) => item.id === pyItem.id);

      expect(foundTs).toBeDefined();
      expect(foundPy).toBeUndefined(); // Python item should not appear
    });
  });

  describe('REQ-DLQ-003: retry_dead_letter_item moves work back to queue', () => {
    it('should move item from DLQ back to work queue', async () => {
      const startTime = Date.now();
      const workItem = createTestWorkItem('typescript');
      workItem.attempts = 3;

      // Move to DLQ
      await moveToDeadLetter(workItem, 'Failed attempts');

      // Verify in DLQ
      let dlqItems = await listDeadLetterItems();
      expect(dlqItems.find((item) => item.id === workItem.id)).toBeDefined();

      // Retry the item
      await retryDeadLetterItem(workItem.id, false);

      // Verify removed from DLQ
      dlqItems = await listDeadLetterItems();
      expect(dlqItems.find((item) => item.id === workItem.id)).toBeUndefined();

      // Verify work is back in queue (subscriber should be able to claim it)
      await createWorkQueueStream('typescript');
      const sub = await subscribeToWorkQueue('typescript', 'test-consumer-dlq-003');

      let claimed = false;
      for await (const msg of sub) {
        const claimedWork = JSON.parse(new TextDecoder().decode(msg.data)) as WorkItem;
        if (claimedWork.id === workItem.id) {
          claimed = true;
          msg.ack();
          break;
        }
        msg.nak(); // NAK other messages
      }

      expect(claimed).toBe(true);

      const duration = Date.now() - startTime;
      console.log(`REQ-DLQ-003: PASS - Item retried and claimed in ${duration}ms`);
    });
  });

  describe('REQ-DLQ-004: retry_dead_letter_item with resetAttempts=true', () => {
    it('should reset attempt count when resetAttempts=true', async () => {
      const startTime = Date.now();
      const workItem = createTestWorkItem('python');
      workItem.attempts = 3;

      // Move to DLQ
      await moveToDeadLetter(workItem, 'Failed attempts');

      // Retry with resetAttempts=true
      await retryDeadLetterItem(workItem.id, true);

      // Subscribe and claim the retried work
      await createWorkQueueStream('python');
      const sub = await subscribeToWorkQueue('python', 'test-consumer-dlq-004');

      let claimedWork: WorkItem | null = null;
      for await (const msg of sub) {
        const work = JSON.parse(new TextDecoder().decode(msg.data)) as WorkItem;
        if (work.id === workItem.id) {
          claimedWork = work;
          msg.ack();
          break;
        }
        msg.nak();
      }

      expect(claimedWork).toBeDefined();
      expect(claimedWork?.attempts).toBe(0); // Should be reset to 0

      const duration = Date.now() - startTime;
      console.log(`REQ-DLQ-004: PASS - Attempts reset to 0 in ${duration}ms`);
    });

    it('should preserve attempt count when resetAttempts=false', async () => {
      const workItem = createTestWorkItem('testing');
      workItem.attempts = 2;

      await moveToDeadLetter(workItem, 'Test');
      await retryDeadLetterItem(workItem.id, false);

      // Subscribe and claim
      await createWorkQueueStream('testing');
      const sub = await subscribeToWorkQueue('testing', 'test-consumer-dlq-004b');

      let claimedWork: WorkItem | null = null;
      for await (const msg of sub) {
        const work = JSON.parse(new TextDecoder().decode(msg.data)) as WorkItem;
        if (work.id === workItem.id) {
          claimedWork = work;
          msg.ack();
          break;
        }
        msg.nak();
      }

      expect(claimedWork?.attempts).toBe(2); // Should preserve original count
    });
  });

  describe('REQ-DLQ-005: discard_dead_letter_item permanently removes work', () => {
    it('should permanently delete item from DLQ', async () => {
      const startTime = Date.now();
      const workItem = createTestWorkItem('code-review');
      workItem.attempts = 3;

      // Move to DLQ
      await moveToDeadLetter(workItem, 'Permanent failure');

      // Verify in DLQ
      let dlqItems = await listDeadLetterItems();
      expect(dlqItems.find((item) => item.id === workItem.id)).toBeDefined();

      // Discard the item
      await discardDeadLetterItem(workItem.id);

      // Verify removed from DLQ
      dlqItems = await listDeadLetterItems();
      expect(dlqItems.find((item) => item.id === workItem.id)).toBeUndefined();

      // Verify item is NOT in work queue (it should be gone forever)
      await createWorkQueueStream('code-review');
      const sub = await subscribeToWorkQueue('code-review', 'test-consumer-dlq-005');

      let found = false;
      const timeout = setTimeout(() => {
        // No work should be found after 2 seconds
      }, 2000);

      try {
        for await (const msg of sub) {
          const work = JSON.parse(new TextDecoder().decode(msg.data)) as WorkItem;
          if (work.id === workItem.id) {
            found = true;
            break;
          }
          msg.nak();
        }
      } catch (err) {
        // Timeout or no messages
      } finally {
        clearTimeout(timeout);
      }

      expect(found).toBe(false); // Item should NOT be found

      const duration = Date.now() - startTime;
      console.log(`REQ-DLQ-005: PASS - Item permanently discarded in ${duration}ms`);
    });

    it('should throw error when trying to discard non-existent item', async () => {
      const fakeId = '00000000-0000-4000-a000-000000000000';
      await expect(discardDeadLetterItem(fakeId)).rejects.toThrow('not found');
    });
  });
});
