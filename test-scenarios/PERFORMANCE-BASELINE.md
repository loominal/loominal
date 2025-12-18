# Loom Performance Baseline

**Last Updated**: 2025-12-11
**Status**: Beta - All targets met

## Summary

This document establishes performance baselines for core Loom operations. All measurements were taken with NATS JetStream running locally on the same machine as the test client.

| Metric | p50 | p95 | p99 | Target | Status |
|--------|-----|-----|-----|--------|--------|
| Channel Message Round-Trip | 1ms | 2ms | 2ms | p95 < 100ms | PASS |
| Work Claim Latency | 43ms | 77ms | 79ms | p95 < 200ms | PASS |
| Direct Message Round-Trip | 1ms | 2ms | 2ms | p95 < 100ms | PASS |

## Test Methodology

### Channel Message Latency (REQ-PERF-001)

Measures end-to-end latency for pub/sub messaging through JetStream streams.

- **Test**: 1000 messages published to a JetStream stream
- **Method**: Push consumer with concurrent subscription
- **Measurement**: Time from `js.publish()` call to message receipt in subscriber callback
- **Result**: p95 = 2ms (target < 100ms)

### Work Claim Latency (REQ-PERF-002)

Measures time from work broadcast to work claim acknowledgment.

- **Test**: 100 work items published to a workqueue stream
- **Method**: Sequential broadcast followed by pull consumer fetch
- **Measurement**: Time from `js.publish()` to `msg.ack()` in consumer
- **Result**: p95 = 77ms (target < 200ms)

### Direct Message Latency (REQ-PERF-003)

Measures agent-to-agent messaging latency via personal inbox streams.

- **Test**: 500 direct messages published to an inbox stream
- **Method**: Push consumer with concurrent subscription
- **Measurement**: Time from `js.publish()` call to message receipt in subscriber callback
- **Result**: p95 = 2ms (target < 100ms)

## Test Environment

- **NATS**: Local JetStream (nats://localhost:4222)
- **Node.js**: 20.x
- **Test Client**: NATS.js v2.x
- **Platform**: Linux x64

## Notes

### Why Push vs Pull Consumers

- **Push consumers** (used for channel and DM tests) provide true real-time latency measurement since messages are actively pushed to subscribers
- **Pull consumers** (used for work claim) reflect actual work queue semantics where workers actively fetch work

### Work Queue Latency

Work claim latency is higher than other operations because:
1. Work items are published first, then consumed sequentially
2. Explicit acknowledgment is required for work queue semantics
3. This is intentional for reliable work distribution

### Production Considerations

These baselines are for local NATS. In production with network hops:
- Add ~1-5ms per network hop for intra-datacenter
- Add ~20-100ms for cross-region deployments
- Use NATS clustering for high availability without significant latency impact

## Test Script

Test script location: `test-scenarios/20-performance/test-performance-baseline.mjs`

Run with:
```bash
cd test-scenarios/20-performance
node test-performance-baseline.mjs
```

## Conclusion

All performance targets are met with significant margin. NATS JetStream provides excellent latency characteristics for Loom's messaging requirements.
