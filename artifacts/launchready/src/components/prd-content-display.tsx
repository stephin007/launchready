import { Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CheckCircle2, ChevronDown, ChevronRight, Circle, Clock } from "lucide-react";
import { PrdDetail, TaskItem, UpdateTaskStatusBodyStatus } from "@workspace/api-client-react";

interface PrdContentDisplayProps {
  prd: PrdDetail;
  isShared?: boolean;
  onUpdateTaskStatus?: (taskId: string, status: UpdateTaskStatusBodyStatus) => void;
}

export function PrdContentDisplay({ prd, isShared = false, onUpdateTaskStatus }: PrdContentDisplayProps) {
  const { content } = prd;

  // Group tasks by sprint
  const sprints: Record<number, { userStory: any; task: TaskItem }[]> = {};
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

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === "done") return <CheckCircle2 className="w-5 h-5 text-[var(--status-success)]" />;
    if (status === "in-progress") return <Clock className="w-5 h-5 text-[var(--status-warning)]" />;
    return <Circle className="w-5 h-5 text-[var(--text-muted)]" />;
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

      <div className="space-y-6">
        <h2 className="text-2xl font-medium text-[var(--text-primary)]">Sprint Plan</h2>
        
        {sprintNumbers.map(sprintNum => (
          <Collapsible key={sprintNum} defaultOpen className="border border-[var(--border-default)] rounded-lg bg-[rgba(255,255,255,0.01)] overflow-hidden">
            <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors [&[data-state=open]>div>svg]:rotate-90">
              <div className="flex items-center gap-3">
                <ChevronRight className="w-5 h-5 text-[var(--text-muted)] transition-transform duration-200" />
                <h3 className="text-lg font-medium text-[var(--text-primary)]">Sprint {sprintNum}</h3>
                <Badge variant="outline" className="bg-[rgba(113,112,255,0.15)] text-[var(--accent-bright)] border-0 ml-2">
                  {sprints[sprintNum].length} tasks
                </Badge>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t border-[var(--border-default)]">
              <div className="divide-y divide-[var(--border-subtle)]">
                {sprints[sprintNum].map(({ userStory, task }) => (
                  <div key={task.id} className="p-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors flex items-start gap-4">
                    <div className="pt-1">
                      {isShared ? (
                        <StatusIcon status={task.status} />
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-full">
                            <StatusIcon status={task.status} />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="bg-[var(--bg-elevated)] border-[var(--border-default)]">
                            <DropdownMenuItem onClick={() => onUpdateTaskStatus?.(task.id, "todo" as UpdateTaskStatusBodyStatus)}>
                              <Circle className="w-4 h-4 mr-2 text-[var(--text-muted)]" /> Todo
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onUpdateTaskStatus?.(task.id, "in-progress" as UpdateTaskStatusBodyStatus)}>
                              <Clock className="w-4 h-4 mr-2 text-[var(--status-warning)]" /> In Progress
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onUpdateTaskStatus?.(task.id, "done" as UpdateTaskStatusBodyStatus)}>
                              <CheckCircle2 className="w-4 h-4 mr-2 text-[var(--status-success)]" /> Done
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-4">
                        <h4 className="text-base font-medium text-[var(--text-primary)] truncate">{task.title}</h4>
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
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  );
}