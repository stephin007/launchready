export function allocateSprints<
  T extends {
    id: string;
    effort: string;
    isBlocked: boolean;
    blockedBy: string[];
  }
>(
  tasks: T[],
  storyPriority: string
): (T & { sprintNumber: number })[] {
  const sprint1Ids = new Set<string>();
  const sprint2Ids = new Set<string>();

  const firstPass = tasks.map((task) => {
    let sprint = 3;

    if (storyPriority === 'P1') {
      if (!task.isBlocked) {
        sprint = 1;
        sprint1Ids.add(task.id);
      } else {
        sprint = 2;
        sprint2Ids.add(task.id);
      }
    } else if (storyPriority === 'P2') {
      sprint = 2;
      sprint2Ids.add(task.id);
    } else {
      if (task.effort === 'XL') {
        sprint = 3;
      } else {
        sprint = 3;
      }
    }

    return { ...task, sprintNumber: sprint };
  });

  return firstPass.map((task) => {
    if (task.isBlocked && task.blockedBy.every((dep) => sprint1Ids.has(dep))) {
      return { ...task, sprintNumber: 2 };
    }
    return task;
  });
}
