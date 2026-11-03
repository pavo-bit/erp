# Lane A request to Lane C: lazy initialization required by createApp()

**Status:** OPEN — Lane C owns middleware/ops files.

A1 requires `src/app.ts` to export `createApp()` without startup side effects. Static inspection found:

- `src/middleware/metrics.ts` calls `collectDefaultMetrics()` at module evaluation, which starts a collection interval.
- `src/middleware/rateLimiter.ts` constructs an ioredis client at module evaluation when `REDIS_URL` is configured.
- `src/jobs/queue.ts` constructs BullMQ queues and schedules maintenance jobs at module evaluation; route modules import it.

Please expose explicit initialization for metrics and rate limiter so app construction can register middleware without starting timers or network clients. Initialization should be invoked from `src/index.ts` after bootstrap. Please also advise/own a lazy queue initialization contract for route imports (or authorize Lane A to update the relevant queue module). Until these are resolved, A1 cannot claim that `createApp()` builds the app without starting network clients/timers.

Lane A will avoid editing Lane C middleware and will keep only `app.ts`/`index.ts`/A1 tests in its scope while the request is open.
