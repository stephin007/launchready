import { Layout } from "@/components/layout";
import { PrdContentDisplay } from "@/components/prd-content-display";
import { useGetPrd, useRegeneratePrd, useUpdateTaskStatus, getGetPrdQueryKey, useGetPrdVersions, UpdateTaskStatusBodyStatus } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Link as LinkIcon, RefreshCw, Loader2, History } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function PrdView() {
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: prd, isLoading } = useGetPrd(id, {
    query: { enabled: !!id, queryKey: getGetPrdQueryKey(id) }
  });

  const { data: versions } = useGetPrdVersions(id, {
    query: { enabled: !!id }
  });

  const regeneratePrd = useRegeneratePrd();
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
        toast({ title: "PRD Regenerated successfully" });
      },
      onError: () => {
        toast({ title: "Failed to regenerate", variant: "destructive" });
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
          <div className="flex items-center gap-3">
            <Button variant="outline" className="bg-[rgba(255,255,255,0.02)] border-[var(--border-default)] text-[var(--text-secondary)]" onClick={handleCopyLink} data-testid="button-copy-link">
              <LinkIcon className="w-4 h-4 mr-2" />
              Share Link
            </Button>
            <Button variant="outline" className="bg-[rgba(255,255,255,0.02)] border-[var(--border-default)] text-[var(--text-secondary)]" onClick={handleExportMarkdown} data-testid="button-export-md">
              <Download className="w-4 h-4 mr-2" />
              Export .md
            </Button>
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
              <h2 className="text-2xl font-medium text-[var(--text-primary)]">Version History</h2>
              <div className="border border-[var(--border-default)] rounded-lg bg-[rgba(255,255,255,0.01)] overflow-hidden divide-y divide-[var(--border-subtle)]">
                {versions?.map((v) => (
                  <div key={v.id} className="p-4 flex items-center justify-between hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-[rgba(255,255,255,0.05)] flex items-center justify-center">
                        <History className="w-4 h-4 text-[var(--text-muted)]" />
                      </div>
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">Version {v.versionNumber}</p>
                        <p className="text-sm text-[var(--text-muted)]">{format(parseISO(v.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
                      </div>
                    </div>
                    {v.versionNumber === versions.length && (
                      <span className="text-xs px-2 py-1 rounded bg-[rgba(16,185,129,0.15)] text-[var(--status-success)]">Current</span>
                    )}
                  </div>
                ))}
                {!versions?.length && (
                  <div className="p-8 text-center text-[var(--text-muted)]">No version history available.</div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}