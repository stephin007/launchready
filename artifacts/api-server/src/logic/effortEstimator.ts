const keywords = {
  S: ['copy', 'text', 'label', 'color', 'icon', 'rename', 'update', 'tooltip', 'placeholder'],
  M: ['form', 'button', 'page', 'component', 'display', 'list', 'modal', 'dropdown', 'filter', 'sort'],
  L: ['api', 'integrate', 'database', 'auth', 'logic', 'algorithm', 'endpoint', 'schema', 'hook', 'state'],
  XL: ['payment', 'real-time', 'ml', 'infrastructure', 'migration', 'websocket', 'oauth', 'encryption', 'search'],
};

const effortScores: Record<string, number> = { S: 1, M: 2, L: 3, XL: 4 };

export function estimateEffort(task: { title: string; description: string }): {
  effort: string;
  effortScore: number;
} {
  const combined = `${task.title} ${task.description}`.toLowerCase();

  for (const effort of ['XL', 'L', 'M', 'S'] as const) {
    const kws = keywords[effort];
    if (kws.some((kw) => combined.includes(kw))) {
      return { effort, effortScore: effortScores[effort] };
    }
  }

  return { effort: 'M', effortScore: 2 };
}

export function applyEffortEstimates<T extends { title: string; description: string }>(
  tasks: T[]
): (T & { effort: string; effortScore: number })[] {
  return tasks.map((task) => ({ ...task, ...estimateEffort(task) }));
}
