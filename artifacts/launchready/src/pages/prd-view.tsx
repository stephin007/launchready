import { Layout } from "@/components/layout";
import { PrdContentDisplay } from "@/components/prd-content-display";
import {
  useGetPrd,
  useRegeneratePrd,
  useUpdateTaskStatus,
  useDeletePrd,
  useGetPrdVersion,
  getGetPrdQueryKey,
  getGetPrdVersionQueryKey,
  useGetPrdVersions,
  getGetPrdVersionsQueryKey,
  UpdateTaskStatusBodyStatus,
} from "@workspace/api-client-react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Link as LinkIcon, RefreshCw, Loader2, History, Trash2, Eye } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function PrdView() {
  const params = useParams();
  const id = params.id as string;
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [viewingVersionId, setViewingVersionId] = useState<number | null>(null);

  const { data: prd, isLoading } = useGetPrd(id, {
    query: { enabled: !!id, queryKey: getGetPrdQueryKey(id) }
  });

  const { data: versions } = useGetPrdVersions(id, {
    query: { enabled: !!id, queryKey: getGetPrdVersionsQueryKey(id) }
  });

  const { data: versionDetail, isLoading: versionDetailLoading } = useGetPrdVersion(
    id,
    viewingVersionId ?? 0,
    {
      query: {
        enabled: !!viewingVersionId,
        queryKey: getGetPrdVersionQueryKey(id, viewingVersionId ?? 0),
      }
    }
  );

  const regeneratePrd = useRegeneratePrd();
  const deletePrd = useDeletePrd();
  const updateTaskStatus = useUpdateTaskStatus();

  const handleUpdateStatus = (taskId: string, status: UpdateTaskStatusBodyStatus) => {
    updateTaskStatus.mutate({ id, taskId, data: { status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPrdQueryKey(id) });
      },
      onError: () => {
        toast({ title: "Failed to update task", variant: "destructive" });
      }
    });
  };

  const handleRegenerate = () => {
    regeneratePrd.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPrdQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getGetPrdVersionsQueryKey(id) });
        toast({ title: "PRD Regenerated successfully" });
      },
      onError: () => {
        toast({ title: "Failed to regenerate", variant: "destructive" });
      }
    });
  };

  const handleDelete = () => {
    deletePrd.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/prds"] });
        toast({ title: "PRD deleted" });
        navigate("/");
      },
      onError: () => {
        toast({ title: "Failed to delete PRD", variant: "destructive" });
      }
    });
  };

  const handleCopyLink = () => {
    if (!prd) return;
    const url = `${window.location.origin}/share/${prd.shareToken}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Share link copied to clipboard" });
  };

  const handleExportMarkdown = () => {
    if (!prd) return;
    const { content } = prd;
    let md = `# ${content.title}\n**Summary:** ${content.summary}\n\n`;

    md += `## Goals\n${content.goals.map(g => `- ${g}`).join('\n')}\n\n`;
    md += `## Success Metrics\n${content.successMetrics.map(m => `- ${m}`).join('\n')}\n\n`;

    md += `## User Stories\n`;
    content.userStories.forEach((us, i) => {
      md += `### US-${i+1}: ${us.title}\n`;
      md += `As a ${us.asA}, I want ${us.iWant}, so that ${us.soThat}\n\n`;
      md += `**Acceptance Criteria:**\n${us.acceptanceCriteria.map(ac => `- ${ac}`).join('\n')}\n\n`;

      if (us.tasks.length > 0) {
        md += `**Tasks:**\n`;
        us.tasks.forEach(t => {
          md += `- ${t.title} (Sprint ${t.sprintNumber} | ${t.effort} | ${us.priority}) — ${t.description}\n`;
        });
        md += `\n`;
      }
    });

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${content.title.replace(/\s+/g, '-').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)] mb-4" />
          <p className="text-[var(--text-muted)]">Loading PRD...</p>
        </div>
      </Layout>
    );
  }

  if (!prd) {
    return (
      <Layout>
        <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
          <p className="text-[var(--status-danger)]">PRD not found.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex-1 w-full max-w-5xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              className="bg-[rgba(255,255,255,0.02)] border-[var(--border-default)] text-[var(--text-secondary)]"
              onClick={handleCopyLink}
              data-testid="button-copy-link"
            >
              <LinkIcon className="w-4 h-4 mr-2" />
              Share Link
            </Button>
            <Button
              variant="outline"
              className="bg-[rgba(255,255,255,0.02)] border-[var(--border-default)] text-[var(--text-secondary)]"
              onClick={handleExportMarkdown}
              data-testid="button-export-md"
            >
              <Download className="w-4 h-4 mr-2" />
              Export .md
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-[rgba(255,255,255,0.02)] border-[rgba(239,68,68,0.4)] text-[var(--status-danger)] hover:bg-[rgba(239,68,68,0.08)] hover:border-[rgba(239,68,68,0.6)]"
                  disabled={deletePrd.isPending}
                  data-testid="button-delete-prd"
                >
                  {deletePrd.isPending
                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    : <Trash2 className="w-4 h-4 mr-2" />}
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[var(--bg-card)] border-[var(--border-default)]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-[var(--text-primary)]">Delete this PRD?</AlertDialogTitle>
                  <AlertDialogDescription className="text-[var(--text-muted)]">
                    This will permanently delete <span className="text-[var(--text-primary)] font-medium">"{prd.title}"</span> along with all its tasks, statuses, and version history. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-transparent border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.04)]">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-[var(--status-danger)] hover:bg-[rgba(239,68,68,0.85)] text-white border-0"
                  >
                    Delete PRD
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <Button
            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white"
            onClick={handleRegenerate}
            disabled={regeneratePrd.isPending}
            data-testid="button-regenerate"
          >
            {regeneratePrd.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Regenerate
          </Button>
        </div>

        <Tabs defaultValue="plan" className="w-full">
          <TabsList className="bg-[rgba(255,255,255,0.02)] border border-[var(--border-default)] rounded-lg p-1 mb-8">
            <TabsTrigger value="plan" className="data-[state=active]:bg-[rgba(255,255,255,0.05)] data-[state=active]:text-[var(--text-primary)] text-[var(--text-muted)]">
              Plan
            </TabsTrigger>
            <TabsTrigger value="changelog" className="data-[state=active]:bg-[rgba(255,255,255,0.05)] data-[state=active]:text-[var(--text-primary)] text-[var(--text-muted)]">
              Changelog
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plan" className="m-0 focus:outline-none">
            <PrdContentDisplay prd={prd} onUpdateTaskStatus={handleUpdateStatus} />
          </TabsContent>

          <TabsContent value="changelog" className="m-0 focus:outline-none">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-medium text-[var(--text-primary)]">Version History</h2>
                <p className="text-sm text-[var(--text-muted)] mt-1">Each regeneration creates a new snapshot. Click View to see what the PRD looked like at that point.</p>
              </div>
              <div className="border border-[var(--border-default)] rounded-lg bg-[rgba(255,255,255,0.01)] overflow-hidden divide-y divide-[var(--border-subtle)]">
                {versions?.map((v) => (
                  <div key={v.id} className="p-4 flex items-center justify-between hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-[rgba(255,255,255,0.05)] flex items-center justify-center flex-shrink-0">
                        <History className="w-4 h-4 text-[var(--text-muted)]" />
                      </div>
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">Version {v.versionNumber}</p>
                        <p className="text-sm text-[var(--text-muted)]">{format(parseISO(v.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {v.versionNumber === (versions?.length ?? 0) && (
                        <span className="text-xs px-2 py-1 rounded bg-[rgba(16,185,129,0.15)] text-[var(--status-success)]">Current</span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-transparent border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)]"
                        onClick={() => setViewingVersionId(v.id)}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1.5" />
                        View
                      </Button>
                    </div>
                  </div>
                ))}
                {!versions?.length && (
                  <div className="p-8 text-center text-[var(--text-muted)]">No version history yet. Regenerate the PRD to create snapshots.</div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!viewingVersionId} onOpenChange={(open) => { if (!open) setViewingVersionId(null); }}>
        <DialogContent className="bg-[var(--bg-card)] border-[var(--border-default)] max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-[var(--border-subtle)]">
            <DialogTitle className="text-[var(--text-primary)] flex items-center gap-2">
              <History className="w-4 h-4 text-[var(--text-muted)]" />
              {versionDetail
                ? `Version ${versionDetail.versionNumber} — ${format(parseISO(versionDetail.createdAt), "MMM d, yyyy 'at' h:mm a")}`
                : "Loading version..."}
            </DialogTitle>
          </DialogHeader>

          {versionDetailLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
            </div>
          )}

          {versionDetail && !versionDetailLoading && (
            <div className="pt-2">
              <PrdContentDisplay
                prd={{ ...prd, content: versionDetail.content }}
                onUpdateTaskStatus={() => {}}
                readOnly
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
