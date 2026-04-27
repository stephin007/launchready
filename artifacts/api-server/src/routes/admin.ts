import { Router, type IRouter } from "express";
import { db, prdsTable, taskStatusTable } from "@workspace/db";
import { gte, sql, count } from "drizzle-orm";

const router: IRouter = Router();

router.get("/admin/stats", async (_req, res): Promise<void> => {
  const allPrds = await db.select().from(prdsTable);

  const totalPrds = allPrds.length;

  let totalTasks = 0;
  let totalEffortScore = 0;
  let effortCount = 0;
  const priorityBreakdown = { P1: 0, P2: 0, P3: 0 };
  const effortDistribution = { S: 0, M: 0, L: 0, XL: 0 };

  for (const prd of allPrds) {
    try {
      const content = JSON.parse(prd.rawOutput) as {
        userStories: {
          priority: string;
          tasks: { effortScore: number; effort: string }[];
        }[];
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
    } catch {
      // skip malformed
    }
  }

  const avgEffortScore = effortCount > 0 ? totalEffortScore / effortCount : 0;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const prdsThisWeek = allPrds.filter((p) => p.createdAt >= sevenDaysAgo).length;

  const prdsPerDay: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayCount = allPrds.filter((p) => {
      const pDate = p.createdAt.toISOString().split("T")[0];
      return pDate === dateStr;
    }).length;
    prdsPerDay.push({ date: dateStr, count: dayCount });
  }

  res.json({
    totalPrds,
    totalTasks,
    avgEffortScore: Math.round(avgEffortScore * 100) / 100,
    prdsThisWeek,
    prdsPerDay,
    priorityBreakdown,
    effortDistribution,
  });
});

export default router;
