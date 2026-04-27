const p1Keywords = ['login', 'auth', 'onboard', 'setup', 'account'];

export function assignPriority(story: {
  title: string;
  tasks: { effort: string }[];
  successMetrics?: string[];
}): { priority: string; priorityScore: number } {
  const combined = story.title.toLowerCase();

  if (p1Keywords.some((kw) => combined.includes(kw))) {
    return { priority: 'P1', priorityScore: 9 };
  }

  if (story.tasks.some((t) => t.effort === 'XL')) {
    return { priority: 'P1', priorityScore: 8 };
  }

  if (story.tasks.every((t) => t.effort === 'S')) {
    return { priority: 'P3', priorityScore: 3 };
  }

  return { priority: 'P2', priorityScore: 5 };
}

export function applyPriorities<
  T extends { title: string; tasks: { effort: string }[] }
>(stories: T[]): (T & { priority: string; priorityScore: number })[] {
  return stories.map((story) => ({ ...story, ...assignPriority(story) }));
}
