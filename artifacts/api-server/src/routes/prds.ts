import { Router, type IRouter } from "express";
import { v4 as uuidv4 } from "uuid";
import { db, prdsTable, taskStatusTable, prdVersionsTable } from "@workspace/db";
import { eq, and, desc, sql, gte, count } from "drizzle-orm";
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

router.post("/generate", async (req, res): Promise<void> => {
  const parsed = GeneratePrdBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { problem, audience, success, productName } = parsed.data;

  req.log.info({ problem, audience }, "Generating PRD");

  const rawPrd = await callOpenRouter({ problem, audience, success, productName });
  const processedContent = processPrd(rawPrd);

  const id = uuidv4();
  const shareToken = uuidv4();

  const [prd] = await db.insert(prdsTable).values({
    id,
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

router.get("/prds", async (_req, res): Promise<void> => {
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

router.get("/prds/:id", async (req, res): Promise<void> => {
  const params = GetPrdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [prd] = await db.select().from(prdsTable).where(eq(prdsTable.id, params.data.id));
  if (!prd) {
    res.status(404).json({ error: "PRD not found" });
    return;
  }

  const taskStatuses = await db.select().from(taskStatusTable).where(eq(taskStatusTable.prdId, prd.id));
  res.json(buildPrdDetail(prd, taskStatuses));
});

router.post("/prds/:id/regenerate", async (req, res): Promise<void> => {
  const params = RegeneratePrdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [prd] = await db.select().from(prdsTable).where(eq(prdsTable.id, params.data.id));
  if (!prd) {
    res.status(404).json({ error: "PRD not found" });
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

router.patch("/prds/:id/tasks/:taskId", async (req, res): Promise<void> => {
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

  // Verify PRD exists and taskId is a valid task within it
  const [prd] = await db.select().from(prdsTable).where(eq(prdsTable.id, prdId));
  if (!prd) {
    res.status(404).json({ error: "PRD not found" });
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

router.get("/prds/:id/versions", async (req, res): Promise<void> => {
  const params = GetPrdVersionsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
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

router.get("/prds/:id/versions/:versionId", async (req, res): Promise<void> => {
  const params = GetPrdVersionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
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

router.delete("/prds/:id", async (req, res): Promise<void> => {
  const params = DeletePrdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [prd] = await db.select().from(prdsTable).where(eq(prdsTable.id, params.data.id));
  if (!prd) {
    res.status(404).json({ error: "PRD not found" });
    return;
  }

  await db.delete(taskStatusTable).where(eq(taskStatusTable.prdId, params.data.id));
  await db.delete(prdVersionsTable).where(eq(prdVersionsTable.prdId, params.data.id));
  await db.delete(prdsTable).where(eq(prdsTable.id, params.data.id));

  res.status(204).send();
});

export default router;
