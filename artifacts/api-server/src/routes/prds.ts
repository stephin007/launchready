import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { db, prdsTable, taskStatusTable, prdVersionsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import {
  GeneratePrdBody,
  GetPrdParams,
  UpdateTaskStatusParams,
  UpdateTaskStatusBody,
  RegeneratePrdParams,
  GetPrdVersionsParams,
  GetPrdVersionParams,
  DeletePrdParams,
  GetSharedPrdParams,
} from "@workspace/api-zod";
import { callOpenRouter } from "../logic/openrouter";
import { processPrd } from "../logic/prdProcessor";

const router: IRouter = Router();

function getClerkUserId(req: Request): string | null {
  return getAuth(req)?.userId ?? null;
}

function isClerkAdmin(req: Request): boolean {
  const auth = getAuth(req);
  return auth?.sessionClaims?.publicMetadata?.role === "admin";
}

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const userId = getClerkUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const userId = getClerkUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isClerkAdmin(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  req.userId = userId;
  next();
}

function buildPrdDetail(prd: typeof prdsTable.$inferSelect, taskStatuses: typeof taskStatusTable.$inferSelect[]) {
  const content = JSON.parse(prd.rawOutput) as ReturnType<typeof processPrd>;

  const statusMap = new Map(taskStatuses.map((ts) => [ts.taskId, ts.status]));

  const updatedContent = {
    ...content,
    userStories: content.userStories.map((story) => ({
      ...story,
      tasks: story.tasks.map((task) => ({
        ...task,
        status: statusMap.get(task.id) ?? task.status,
      })),
    })),
  };

  return {
    id: prd.id,
    title: prd.title,
    problem: prd.problem,
    audience: prd.audience,
    successCriteria: prd.successCriteria,
    productName: prd.productName,
    shareToken: prd.shareToken,
    createdAt: prd.createdAt.toISOString(),
    content: updatedContent,
  };
}

router.post("/generate", requireAuth, async (req, res): Promise<void> => {
  const parsed = GeneratePrdBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { problem, audience, success, productName } = parsed.data;
  const userId = req.userId!;

  req.log.info({ problem, audience }, "Generating PRD");

  const rawPrd = await callOpenRouter({ problem, audience, success, productName });
  const processedContent = processPrd(rawPrd);

  const id = uuidv4();
  const shareToken = uuidv4();

  const [prd] = await db.insert(prdsTable).values({
    id,
    userId,
    title: processedContent.title,
    problem,
    audience,
    successCriteria: success,
    productName: productName ?? null,
    rawOutput: JSON.stringify(processedContent),
    shareToken,
  }).returning();

  await db.insert(prdVersionsTable).values({
    prdId: id,
    versionNumber: 1,
    snapshot: JSON.stringify(processedContent),
  });

  const taskStatuses = await db.select().from(taskStatusTable).where(eq(taskStatusTable.prdId, id));

  res.status(201).json(buildPrdDetail(prd, taskStatuses));
});

router.get("/prds", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;

  const prds = await db
    .select()
    .from(prdsTable)
    .where(eq(prdsTable.userId, userId))
    .orderBy(desc(prdsTable.createdAt));

  const results = prds.map((prd) => {
    const content = JSON.parse(prd.rawOutput) as ReturnType<typeof processPrd>;
    const allTasks = content.userStories.flatMap((s) => s.tasks);
    const priorityMix = { P1: 0, P2: 0, P3: 0 };
    content.userStories.forEach((story) => {
      const p = story.priority as keyof typeof priorityMix;
      if (p in priorityMix) priorityMix[p]++;
    });

    return {
      id: prd.id,
      title: prd.title,
      problem: prd.problem,
      productName: prd.productName,
      shareToken: prd.shareToken,
      createdAt: prd.createdAt.toISOString(),
      totalTasks: allTasks.length,
      priorityMix,
    };
  });

  res.json(results);
});

router.get("/prds/stats", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const userPrds = await db.select().from(prdsTable).where(eq(prdsTable.userId, userId));

  let totalTasks = 0;
  let totalEffortScore = 0;
  let effortCount = 0;
  const priorityBreakdown = { P1: 0, P2: 0, P3: 0 };
  const effortDistribution = { S: 0, M: 0, L: 0, XL: 0 };

  for (const prd of userPrds) {
    try {
      const content = JSON.parse(prd.rawOutput) as {
        userStories: { priority: string; tasks: { effortScore: number; effort: string }[] }[];
      };
      for (const story of content.userStories) {
        const p = story.priority as keyof typeof priorityBreakdown;
        if (p in priorityBreakdown) priorityBreakdown[p]++;
        for (const task of story.tasks) {
          totalTasks++;
          totalEffortScore += task.effortScore ?? 2;
          effortCount++;
          const e = task.effort as keyof typeof effortDistribution;
          if (e in effortDistribution) effortDistribution[e]++;
        }
      }
    } catch { /* skip malformed */ }
  }

  const avgEffortScore = effortCount > 0 ? totalEffortScore / effortCount : 0;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const prdsThisWeek = userPrds.filter((p) => p.createdAt >= sevenDaysAgo).length;

  const prdsPerDay: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayCount = userPrds.filter((p) => p.createdAt.toISOString().split("T")[0] === dateStr).length;
    prdsPerDay.push({ date: dateStr, count: dayCount });
  }

  res.json({
    totalPrds: userPrds.length,
    totalTasks,
    avgEffortScore: Math.round(avgEffortScore * 100) / 100,
    prdsThisWeek,
    prdsPerDay,
    priorityBreakdown,
    effortDistribution,
  });
});

router.get("/admin/prds", requireAdmin, async (_req, res): Promise<void> => {
  const prds = await db.select().from(prdsTable).orderBy(desc(prdsTable.createdAt));

  const results = prds.map((prd) => {
    const content = JSON.parse(prd.rawOutput) as ReturnType<typeof processPrd>;
    const allTasks = content.userStories.flatMap((s) => s.tasks);
    const priorityMix = { P1: 0, P2: 0, P3: 0 };
    content.userStories.forEach((story) => {
      const p = story.priority as keyof typeof priorityMix;
      if (p in priorityMix) priorityMix[p]++;
    });

    return {
      id: prd.id,
      title: prd.title,
      problem: prd.problem,
      productName: prd.productName,
      shareToken: prd.shareToken,
      userId: prd.userId,
      createdAt: prd.createdAt.toISOString(),
      totalTasks: allTasks.length,
      priorityMix,
    };
  });

  res.json(results);
});

router.get("/prds/share/:token", async (req, res): Promise<void> => {
  const params = GetSharedPrdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [prd] = await db.select().from(prdsTable).where(eq(prdsTable.shareToken, params.data.token));
  if (!prd) {
    res.status(404).json({ error: "PRD not found" });
    return;
  }

  const taskStatuses = await db.select().from(taskStatusTable).where(eq(taskStatusTable.prdId, prd.id));
  res.json(buildPrdDetail(prd, taskStatuses));
});

router.get("/prds/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetPrdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = req.userId!;
  const admin = isClerkAdmin(req);

  const [prd] = await db.select().from(prdsTable).where(eq(prdsTable.id, params.data.id));
  if (!prd) {
    res.status(404).json({ error: "PRD not found" });
    return;
  }

  if (!admin && prd.userId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const taskStatuses = await db.select().from(taskStatusTable).where(eq(taskStatusTable.prdId, prd.id));
  res.json(buildPrdDetail(prd, taskStatuses));
});

router.post("/prds/:id/regenerate", requireAuth, async (req, res): Promise<void> => {
  const params = RegeneratePrdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = req.userId!;
  const admin = isClerkAdmin(req);

  const [prd] = await db.select().from(prdsTable).where(eq(prdsTable.id, params.data.id));
  if (!prd) {
    res.status(404).json({ error: "PRD not found" });
    return;
  }

  if (!admin && prd.userId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  req.log.info({ id: prd.id }, "Regenerating PRD");

  const rawPrd = await callOpenRouter({
    problem: prd.problem ?? "",
    audience: prd.audience ?? "",
    success: prd.successCriteria ?? "",
    productName: prd.productName,
  });

  const processedContent = processPrd(rawPrd);

  const [latestVersion] = await db
    .select({ versionNumber: prdVersionsTable.versionNumber })
    .from(prdVersionsTable)
    .where(eq(prdVersionsTable.prdId, prd.id))
    .orderBy(desc(prdVersionsTable.versionNumber))
    .limit(1);

  const nextVersion = (latestVersion?.versionNumber ?? 0) + 1;

  await db.insert(prdVersionsTable).values({
    prdId: prd.id,
    versionNumber: nextVersion,
    snapshot: JSON.stringify(processedContent),
  });

  const [updated] = await db
    .update(prdsTable)
    .set({
      title: processedContent.title,
      rawOutput: JSON.stringify(processedContent),
    })
    .where(eq(prdsTable.id, prd.id))
    .returning();

  await db.delete(taskStatusTable).where(eq(taskStatusTable.prdId, prd.id));

  res.json(buildPrdDetail(updated, []));
});

router.patch("/prds/:id/tasks/:taskId", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateTaskStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateTaskStatusBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { id: prdId, taskId } = params.data;
  const { status } = body.data;
  const userId = req.userId!;
  const admin = isClerkAdmin(req);

  const [prd] = await db.select().from(prdsTable).where(eq(prdsTable.id, prdId));
  if (!prd) {
    res.status(404).json({ error: "PRD not found" });
    return;
  }

  if (!admin && prd.userId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const content = JSON.parse(prd.rawOutput) as ReturnType<typeof processPrd>;
  const allTaskIds = new Set(content.userStories.flatMap((s) => s.tasks.map((t) => t.id)));
  if (!allTaskIds.has(taskId)) {
    res.status(404).json({ error: "Task not found in PRD" });
    return;
  }

  const existing = await db
    .select()
    .from(taskStatusTable)
    .where(and(eq(taskStatusTable.prdId, prdId), eq(taskStatusTable.taskId, taskId)));

  let record;
  if (existing.length > 0) {
    const [updated] = await db
      .update(taskStatusTable)
      .set({ status })
      .where(and(eq(taskStatusTable.prdId, prdId), eq(taskStatusTable.taskId, taskId)))
      .returning();
    record = updated;
  } else {
    const [inserted] = await db
      .insert(taskStatusTable)
      .values({ id: uuidv4(), prdId, taskId, status })
      .returning();
    record = inserted;
  }

  res.json({
    id: record.id,
    prdId: record.prdId,
    taskId: record.taskId,
    status: record.status,
    updatedAt: record.updatedAt.toISOString(),
  });
});

router.get("/prds/:id/versions", requireAuth, async (req, res): Promise<void> => {
  const params = GetPrdVersionsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = req.userId!;
  const admin = isClerkAdmin(req);

  const [prd] = await db.select().from(prdsTable).where(eq(prdsTable.id, params.data.id));
  if (!prd) {
    res.status(404).json({ error: "PRD not found" });
    return;
  }

  if (!admin && prd.userId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const versions = await db
    .select()
    .from(prdVersionsTable)
    .where(eq(prdVersionsTable.prdId, params.data.id))
    .orderBy(desc(prdVersionsTable.versionNumber));

  res.json(
    versions.map((v) => ({
      id: v.id,
      prdId: v.prdId,
      versionNumber: v.versionNumber,
      createdAt: v.createdAt.toISOString(),
    }))
  );
});

router.get("/prds/:id/versions/:versionId", requireAuth, async (req, res): Promise<void> => {
  const params = GetPrdVersionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = req.userId!;
  const admin = isClerkAdmin(req);

  const [prd] = await db.select().from(prdsTable).where(eq(prdsTable.id, params.data.id));
  if (!prd) {
    res.status(404).json({ error: "PRD not found" });
    return;
  }

  if (!admin && prd.userId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [version] = await db
    .select()
    .from(prdVersionsTable)
    .where(
      and(
        eq(prdVersionsTable.prdId, params.data.id),
        eq(prdVersionsTable.id, params.data.versionId)
      )
    );

  if (!version) {
    res.status(404).json({ error: "Version not found" });
    return;
  }

  res.json({
    id: version.id,
    prdId: version.prdId,
    versionNumber: version.versionNumber,
    createdAt: version.createdAt.toISOString(),
    content: JSON.parse(version.snapshot),
  });
});

router.delete("/prds/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeletePrdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = req.userId!;
  const admin = isClerkAdmin(req);

  const [prd] = await db.select().from(prdsTable).where(eq(prdsTable.id, params.data.id));
  if (!prd) {
    res.status(404).json({ error: "PRD not found" });
    return;
  }

  if (!admin && prd.userId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(taskStatusTable).where(eq(taskStatusTable.prdId, params.data.id));
  await db.delete(prdVersionsTable).where(eq(prdVersionsTable.prdId, params.data.id));
  await db.delete(prdsTable).where(eq(prdsTable.id, params.data.id));

  res.status(204).send();
});

export default router;
