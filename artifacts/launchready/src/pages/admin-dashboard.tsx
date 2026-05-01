import { Layout } from "@/components/layout";
import { useGetAdminStats, getGetAdminStatsQueryKey, useDeletePrd, type PrdSummary } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, parseISO } from "date-fns";
import { Loader2, FileText, CheckCircle2, Link as LinkIcon, Eye, Zap, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";

function useAdminListPrds() {
  return useQuery<(PrdSummary & { userId?: string })[]>({
    queryKey: ["/api/admin/prds"],
    queryFn: async () => {
      const res = await fetch("/api/admin/prds", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch admin PRDs");
      return res.json();
    },
  });
}

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const { user, isLoaded } = useUser();
  const { data: stats, isLoading: statsLoading } = useGetAdminStats();
  const { data: prds, isLoading: prdsLoading } = useAdminListPrds();
  const deletePrd = useDeletePrd();

  const isAdmin = isLoaded && (user?.publicMetadata as Record<string, unknown>)?.role === "admin";

  const handleDelete = (prdId: string) => {
    deletePrd.mutate({ id: prdId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/prds"] });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
      },
    });
  };

  if (!isLoaded) {
    return (
      <Layout>
        <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)] mb-4" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
          <p className="text-lg font-medium mb-2" style={{ color: "var(--text-primary)" }}>Access restricted</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>The admin dashboard is only available to administrators.</p>
        </div>
      </Layout>
    );
  }

  if (statsLoading || prdsLoading) {
    return (
      <Layout>
        <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)] mb-4" />
          <p className="text-[var(--text-muted)]">Loading dashboard...</p>
        </div>
      </Layout>
    );
  }

  if (!stats || !prds) {
    return (
      <Layout>
        <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
          <p className="text-[var(--status-danger)]">Failed to load dashboard data.</p>
        </div>
      </Layout>
    );
  }

  const priorityData = [
    { name: "P1", value: stats.priorityBreakdown.P1, color: "var(--p1)" },
    { name: "P2", value: stats.priorityBreakdown.P2, color: "var(--p2)" },
    { name: "P3", value: stats.priorityBreakdown.P3, color: "var(--p3)" },
  ].filter(d => d.value > 0);

  const effortData = [
    { name: "S", value: stats.effortDistribution.S, fill: "var(--effort-s)" },
    { name: "M", value: stats.effortDistribution.M, fill: "var(--effort-m)" },
    { name: "L", value: stats.effortDistribution.L, fill: "var(--effort-l)" },
    { name: "XL", value: stats.effortDistribution.XL, fill: "var(--effort-xl)" },
  ];

  const chartTheme = {
    background: "transparent",
    textColor: "var(--text-muted)",
    fontSize: 12,
    axisLine: false,
    tickLine: false,
  };

  interface TooltipPayloadEntry {
    color?: string;
    fill?: string;
    name: string;
    value: number;
  }
  interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayloadEntry[];
    label?: string;
  }
  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] p-3 rounded shadow-lg text-sm">
          <p className="text-[var(--text-primary)] font-medium mb-1">{label}</p>
          <p style={{ color: payload[0].color ?? payload[0].fill }}>
            {payload[0].name}: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  const isEmpty = stats.totalPrds === 0;

  return (
    <Layout>
      <div className="flex-1 w-full max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-medium text-[var(--text-primary)]">Admin Dashboard</h1>
          <p className="text-[var(--text-muted)] mt-1">Overview of all generated PRDs and tasks.</p>
        </div>

        {isEmpty ? (
          <div
            className="flex flex-col items-center justify-center py-24 text-center rounded-xl border border-dashed"
            style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.01)" }}
          >
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center mb-5"
              style={{ background: "rgba(94,106,210,0.12)", border: "1px solid rgba(94,106,210,0.2)" }}
            >
              <Zap size={24} style={{ color: "var(--accent-bright)" }} />
            </div>
            <p className="text-lg font-medium" style={{ color: "var(--text-primary)" }}>No PRDs yet</p>
            <p className="text-sm mt-1 max-w-xs" style={{ color: "var(--text-muted)" }}>
              Generate your first PRD to see stats, charts, and your full planning history here.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white transition-colors"
              style={{ background: "var(--accent)" }}
            >
              Generate your first PRD
            </Link>
          </div>
        ) : (
        <><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-[rgba(255,255,255,0.02)] border-[var(--border-default)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[var(--text-secondary)]">Total PRDs</CardTitle>
              <FileText className="w-4 h-4 text-[var(--text-muted)]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-[var(--text-primary)]">{stats.totalPrds}</div>
            </CardContent>
          </Card>
          <Card className="bg-[rgba(255,255,255,0.02)] border-[var(--border-default)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[var(--text-secondary)]">Total Tasks</CardTitle>
              <CheckCircle2 className="w-4 h-4 text-[var(--text-muted)]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-[var(--text-primary)]">{stats.totalTasks}</div>
            </CardContent>
          </Card>
          <Card className="bg-[rgba(255,255,255,0.02)] border-[var(--border-default)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[var(--text-secondary)]">Avg Effort Score</CardTitle>
              <div className="w-4 h-4 text-[var(--text-muted)] font-mono text-xs flex items-center justify-center">pts</div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-[var(--text-primary)]">{stats.avgEffortScore.toFixed(1)}</div>
            </CardContent>
          </Card>
          <Card className="bg-[rgba(255,255,255,0.02)] border-[var(--border-default)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[var(--text-secondary)]">PRDs This Week</CardTitle>
              <div className="w-4 h-4 text-[var(--text-muted)] font-mono text-xs flex items-center justify-center">7d</div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-[var(--text-primary)]">{stats.prdsThisWeek}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-[rgba(255,255,255,0.02)] border-[var(--border-default)] lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base text-[var(--text-primary)]">PRDs per day (Last 7 days)</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.prdsPerDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => format(parseISO(val), "MMM d")}
                    stroke={chartTheme.textColor}
                    fontSize={chartTheme.fontSize}
                    tickLine={chartTheme.tickLine}
                    axisLine={chartTheme.axisLine}
                  />
                  <YAxis 
                    allowDecimals={false}
                    stroke={chartTheme.textColor}
                    fontSize={chartTheme.fontSize}
                    tickLine={chartTheme.tickLine}
                    axisLine={chartTheme.axisLine}
                  />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="bg-[rgba(255,255,255,0.02)] border-[var(--border-default)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-[var(--text-primary)]">Priority Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="h-[200px] pb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-2">
                  {priorityData.map((entry, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                      {entry.name}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[rgba(255,255,255,0.02)] border-[var(--border-default)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-[var(--text-primary)]">Effort Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-[150px] pb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={effortData} layout="vertical" margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      stroke={chartTheme.textColor}
                      fontSize={chartTheme.fontSize}
                      tickLine={chartTheme.tickLine}
                      axisLine={chartTheme.axisLine}
                    />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                      {effortData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="bg-[rgba(255,255,255,0.02)] border-[var(--border-default)]">
          <CardHeader>
            <CardTitle className="text-base text-[var(--text-primary)]">Recent PRDs</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-[var(--border-subtle)] bg-[rgba(255,255,255,0.01)]">
                <TableRow className="border-[var(--border-subtle)] hover:bg-transparent">
                  <TableHead className="text-[var(--text-muted)] font-medium">Title</TableHead>
                  <TableHead className="text-[var(--text-muted)] font-medium">Date</TableHead>
                  <TableHead className="text-[var(--text-muted)] font-medium text-right">Tasks</TableHead>
                  <TableHead className="text-[var(--text-muted)] font-medium">Priority Mix</TableHead>
                  <TableHead className="text-[var(--text-muted)] font-medium text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prds.length === 0 ? (
                  <TableRow className="border-[var(--border-subtle)] hover:bg-[rgba(255,255,255,0.02)]">
                    <TableCell colSpan={5} className="text-center py-8 text-[var(--text-muted)]">
                      No PRDs found
                    </TableCell>
                  </TableRow>
                ) : prds.map((prd) => (
                  <TableRow key={prd.id} className="border-[var(--border-subtle)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <TableCell className="font-medium text-[var(--text-primary)] max-w-[300px] truncate">
                      {prd.title}
                    </TableCell>
                    <TableCell className="text-[var(--text-secondary)] whitespace-nowrap">
                      {format(parseISO(prd.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right text-[var(--text-secondary)]">
                      {prd.totalTasks}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5 items-center">
                        <Badge variant="outline" className="bg-[rgba(239,68,68,0.1)] text-[var(--p1)] border-0 text-xs px-1.5 py-0 h-5 font-mono">
                          P1: {prd.priorityMix.P1}
                        </Badge>
                        <Badge variant="outline" className="bg-[rgba(245,158,11,0.1)] text-[var(--p2)] border-0 text-xs px-1.5 py-0 h-5 font-mono">
                          P2: {prd.priorityMix.P2}
                        </Badge>
                        <Badge variant="outline" className="bg-[rgba(16,185,129,0.1)] text-[var(--p3)] border-0 text-xs px-1.5 py-0 h-5 font-mono">
                          P3: {prd.priorityMix.P3}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link href={`/share/${prd.shareToken}`} className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors" title="Shared link">
                          <LinkIcon size={16} />
                        </Link>
                        <Link href={`/prd/${prd.id}`} className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors" title="View PRD">
                          <Eye size={16} />
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              className="text-[var(--text-muted)] hover:text-[var(--status-danger)] transition-colors"
                              title="Delete PRD"
                              disabled={deletePrd.isPending}
                            >
                              {deletePrd.isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-[var(--bg-card)] border-[var(--border-default)]">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-[var(--text-primary)]">Delete this PRD?</AlertDialogTitle>
                              <AlertDialogDescription className="text-[var(--text-muted)]">
                                This will permanently delete <span className="text-[var(--text-primary)] font-medium">"{prd.title}"</span> and all its data. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-transparent border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.04)]">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(prd.id)}
                                className="bg-[var(--status-danger)] hover:bg-[rgba(239,68,68,0.85)] text-white border-0"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
        </>)}
      </div>
    </Layout>
  );
}