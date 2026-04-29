import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, ChevronRight, Circle } from "lucide-react";
import { PrdDetail, TaskItem, UserStory, UpdateTaskStatusBodyStatus } from "@workspace/api-client-react";

interface PrdContentDisplayProps {
  prd: PrdDetail;
  isShared?: boolean;
  readOnly?: boolean;
  onUpdateTaskStatus?: (taskId: string, status: UpdateTaskStatusBodyStatus) => void;
}

type Status = "todo" | "in-progress" | "done";

const CYCLE: Record<Status, Status> = {
  "todo": "in-progress",
  "in-progress": "done",
  "done": "todo",
};

function StatusIcon({ status }: { status: string }) {
  if (status === "done") {
    return <CheckCircle2 className="w-5 h-5" style={{ color: "var(--status-success)" }} />;
  }
  if (status === "in-progress") {
    return (
      <span
        style={{
          display: "block",
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          backgroundColor: "var(--status-success)",
          opacity: 0.85,
          flexShrink: 0,
        }}
      />
    );
  }
  return <Circle className="w-5 h-5" style={{ color: "var(--text-subtle)" }} />;
}

export function PrdContentDisplay({ prd, isShared = false, readOnly = false, onUpdateTaskStatus }: PrdContentDisplayProps) {
  const { content } = prd;

  // Optimistic status overrides — applied instantly on click, confirmed when re-fetch lands
  const [optimistic, setOptimistic] = useState<Record<string, Status>>({});

  const getStatus = (task: TaskItem): Status =>
    optimistic[task.id] ?? (task.status as Status) ?? "todo";

  const handleCycle = (task: TaskItem) => {
    const current = getStatus(task);
    const next = CYCLE[current];
    setOptimistic(prev => ({ ...prev, [task.id]: next }));
    onUpdateTaskStatus?.(task.id, next as UpdateTaskStatusBodyStatus);
  };

  // Group tasks by sprint
  const sprints: Record<number, { userStory: UserStory; task: TaskItem }[]> = {};
  content.userStories.forEach(us => {
    us.tasks.forEach(task => {
      if (!sprints[task.sprintNumber]) {
        sprints[task.sprintNumber] = [];
      }
      sprints[task.sprintNumber].push({ userStory: us, task });
    });
  });

  const sprintNumbers = Object.keys(sprints).map(Number).sort((a, b) => a - b);

  const getPriorityColor = (priority: string) => {
    if (priority === "P1") return "bg-[rgba(239,68,68,0.15)] text-[var(--p1)]";
    if (priority === "P2") return "bg-[rgba(245,158,11,0.15)] text-[var(--p2)]";
    return "bg-[rgba(16,185,129,0.15)] text-[var(--p3)]";
  };

  const getEffortColor = (effort: string) => {
    if (effort === "S") return "bg-[rgba(16,185,129,0.15)] text-[var(--effort-s)]";
    if (effort === "M") return "bg-[rgba(113,112,255,0.15)] text-[var(--effort-m)]";
    if (effort === "L") return "bg-[rgba(245,158,11,0.15)] text-[var(--effort-l)]";
    return "bg-[rgba(239,68,68,0.15)] text-[var(--effort-xl)]";
  };

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <h1 className="text-3xl font-medium tracking-tight text-[var(--text-primary)]">{content.title}</h1>
        <p className="text-lg text-[var(--text-secondary)] leading-relaxed">{content.summary}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-[rgba(255,255,255,0.02)] border-[var(--border-default)] shadow-none">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-[var(--text-primary)]">Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {content.goals.map((goal, i) => (
                <li key={i} className="flex gap-3 text-[var(--text-secondary)]">
                  <span className="text-[var(--text-muted)] mt-1">•</span>
                  <span>{goal}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-[rgba(255,255,255,0.02)] border-[var(--border-default)] shadow-none">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-[var(--text-primary)]">Success Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {content.successMetrics.map((metric, i) => (
                <li key={i} className="flex gap-3 text-[var(--text-secondary)]">
                  <span className="text-[var(--text-muted)] mt-1">•</span>
                  <span>{metric}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-medium text-[var(--text-primary)]">User Stories</h2>
        <div className="space-y-2">
          {content.userStories.map((story, i) => (
            <Collapsible key={story.id} defaultOpen={false}>
              <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-[var(--border-default)] bg-[rgba(255,255,255,0.01)] hover:bg-[rgba(255,255,255,0.025)] transition-colors text-left [&[data-state=open]]:rounded-b-none [&[data-state=open]]:border-b-0 [&[data-state=open]>div>svg]:rotate-90">
                <div className="flex items-center gap-3 min-w-0">
                  <ChevronRight className="w-4 h-4 text-[var(--text-subtle)] shrink-0 transition-transform duration-200" />
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
                      letterSpacing: "0.05em",
                      fontWeight: 500,
                      color: "var(--text-subtle)",
                      textTransform: "uppercase",
                      flexShrink: 0,
                    }}
                  >
                    US-{i + 1}
                  </span>
                  <span className="text-sm font-medium text-[var(--text-primary)] truncate">{story.title}</span>
                </div>
                <Badge variant="outline" className={`border-0 shrink-0 ml-3 ${getPriorityColor(story.priority)}`}>
                  {story.priority}
                </Badge>
              </CollapsibleTrigger>
              <CollapsibleContent className="border border-t-0 border-[var(--border-default)] rounded-b-lg bg-[rgba(255,255,255,0.01)] overflow-hidden">
                <div className="px-5 py-4 space-y-4">
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    As a <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{story.asA}</span>,
                    {" "}I want <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{story.iWant}</span>,
                    {" "}so that <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{story.soThat}</span>.
                  </p>
                  {story.acceptanceCriteria && story.acceptanceCriteria.length > 0 && (
                    <div>
                      <p
                        style={{
                          fontSize: "0.7rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.07em",
                          fontWeight: 600,
                          color: "var(--text-subtle)",
                          marginBottom: "8px",
                        }}
                      >
                        Acceptance Criteria
                      </p>
                      <ul className="space-y-1.5">
                        {story.acceptanceCriteria.map((criterion, j) => (
                          <li key={j} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                            <span
                              aria-hidden="true"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "16px",
                                height: "16px",
                                borderRadius: "3px",
                                border: "1.5px solid rgba(255,255,255,0.15)",
                                flexShrink: 0,
                                marginTop: "2px",
                              }}
                            />
                            <span>{criterion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-medium text-[var(--text-primary)]">Sprint Plan</h2>

        {sprintNumbers.map(sprintNum => {
          const sprintTasks = sprints[sprintNum];
          const effortTotal = sprintTasks.reduce((sum, { task }) => sum + (task.effortScore ?? 0), 0);
          return (
          <Collapsible key={sprintNum} defaultOpen className="border border-[var(--border-default)] rounded-lg bg-[rgba(255,255,255,0.01)] overflow-hidden">
            <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors [&[data-state=open]>div>svg]:rotate-90">
              <div className="flex items-center gap-3">
                <ChevronRight className="w-5 h-5 text-[var(--text-muted)] transition-transform duration-200" />
                <h3 className="text-lg font-medium text-[var(--text-primary)]">Sprint {sprintNum}</h3>
                <Badge variant="outline" className="bg-[rgba(113,112,255,0.15)] text-[var(--accent-bright)] border-0 ml-2">
                  {sprintTasks.length} tasks
                </Badge>
                {effortTotal > 0 && (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-subtle)",
                      fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
                    }}
                  >
                    ~{effortTotal} pts
                  </span>
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t border-[var(--border-default)]">
              <div className="divide-y divide-[var(--border-subtle)]">
                {sprints[sprintNum].map(({ userStory, task }) => {
                  const status = getStatus(task);
                  return (
                    <div key={task.id} className="p-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors flex items-start gap-4">
                      <div className="pt-0.5 flex items-center justify-center">
                        {isShared || readOnly ? (
                          <StatusIcon status={status} />
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleCycle(task)}
                            className="flex items-center justify-center rounded-full transition-opacity hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                            title={`Status: ${status} — click to advance`}
                            data-testid={`status-toggle-${task.id}`}
                          >
                            <StatusIcon status={status} />
                          </button>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-4">
                          <h4
                            className="text-base font-medium truncate"
                            style={{
                              color: status === "done" ? "var(--text-muted)" : "var(--text-primary)",
                              textDecoration: status === "done" ? "line-through" : "none",
                              textDecorationColor: "var(--text-subtle)",
                            }}
                          >
                            {task.title}
                          </h4>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className={`border-0 ${getPriorityColor(userStory.priority)}`}>
                              {userStory.priority}
                            </Badge>
                            <Badge variant="outline" className={`border-0 rounded-full px-2.5 ${getEffortColor(task.effort)}`}>
                              {task.effort}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-[var(--text-muted)]">{task.description}</p>
                        <p className="text-xs text-[var(--text-subtle)] mt-2">
                          Story: <span className="text-[var(--text-secondary)]">{userStory.title}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
        })}
      </div>
    </div>
  );
}
