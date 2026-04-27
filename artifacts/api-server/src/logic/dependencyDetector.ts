export function detectDependencies<
  T extends { id: string; dependsOn: string[] }
>(tasks: T[]): (T & { isBlocked: boolean; blockedBy: string[] })[] {
  const taskIds = new Set(tasks.map((t) => t.id));

  return tasks.map((task) => {
    const unresolvedDeps = task.dependsOn.filter((dep) => taskIds.has(dep));
    return {
      ...task,
      isBlocked: unresolvedDeps.length > 0,
      blockedBy: unresolvedDeps,
    };
  });
}
