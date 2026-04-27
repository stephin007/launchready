import { applyEffortEstimates } from "./effortEstimator";
import { applyPriorities } from "./priorityEngine";
import { detectDependencies } from "./dependencyDetector";
import { allocateSprints } from "./sprintAllocator";
import type { RawPrdContent } from "./openrouter";

export interface ProcessedTask {
  id: string;
  title: string;
  description: string;
  dependsOn: string[];
  status: string;
  effort: string;
  effortScore: number;
  isBlocked: boolean;
  blockedBy: string[];
  sprintNumber: number;
}

export interface ProcessedUserStory {
  id: string;
  title: string;
  asA: string;
  iWant: string;
  soThat: string;
  acceptanceCriteria: string[];
  priority: string;
  priorityScore: number;
  tasks: ProcessedTask[];
}

export interface ProcessedPrdContent {
  title: string;
  summary: string;
  goals: string[];
  successMetrics: string[];
  userStories: ProcessedUserStory[];
}

export function processPrd(raw: RawPrdContent): ProcessedPrdContent {
  const userStories = raw.userStories.map((story) => {
    const tasksWithEffort = applyEffortEstimates(story.tasks);
    const tasksWithDeps = detectDependencies(tasksWithEffort);
    const storyWithPriority = applyPriorities([{ ...story, tasks: tasksWithEffort }])[0];
    const tasksWithSprints = allocateSprints(tasksWithDeps, storyWithPriority.priority);

    return {
      ...storyWithPriority,
      tasks: tasksWithSprints,
    };
  });

  return {
    title: raw.title,
    summary: raw.summary,
    goals: raw.goals,
    successMetrics: raw.successMetrics,
    userStories,
  };
}
