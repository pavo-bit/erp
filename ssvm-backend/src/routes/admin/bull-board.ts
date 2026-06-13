import { ExpressAdapter } from "@bull-board/express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import {
  emailQueue,
  smsQueue,
  reportQueue,
  notificationQueue,
  importQueue,
  webhookQueue
} from "../../jobs/queue";
import { authenticate, requireRole } from "../../middleware/auth";
import { Role } from "@prisma/client";
import { Router } from "express";

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/api/admin/queues");

// Collect all initialized queues
const queues = [
  emailQueue,
  smsQueue,
  reportQueue,
  notificationQueue,
  importQueue,
  webhookQueue
]
  .filter((q) => q !== null)
  .map((q) => new BullMQAdapter(q!));

createBullBoard({
  queues,
  serverAdapter,
});

const router = Router();

// Protect the board: Only Super Admins can access the queue monitor
router.use("/", authenticate, requireRole(Role.SUPER_ADMIN), serverAdapter.getRouter());

export default router;
