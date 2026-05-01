import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Zap, FileText, Users, BarChart3, ArrowRight } from "lucide-react";

export default function Landing() {
  return (
    <Layout>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="w-full max-w-2xl text-center space-y-6">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border"
            style={{
              background: "rgba(94,106,210,0.1)",
              borderColor: "rgba(94,106,210,0.25)",
              color: "var(--accent-bright)",
            }}
          >
            <Zap size={12} />
            AI-powered product planning
          </div>

          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
            From idea to PRD
            <br />
            <span style={{ color: "var(--accent-bright)" }}>in minutes</span>
          </h1>

          <p className="text-lg max-w-xl mx-auto leading-relaxed" style={{ color: "var(--text-muted)" }}>
            LaunchReady turns your product idea into a structured PRD with user stories, sprint plans, and effort estimates — all powered by AI.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/sign-up">
              <Button
                className="gap-2 px-6 py-2.5 text-sm font-medium"
                style={{ background: "var(--accent)", color: "white" }}
              >
                Get started free
                <ArrowRight size={16} />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button
                variant="outline"
                className="gap-2 px-6 py-2.5 text-sm font-medium border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)]"
              >
                Sign in
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-12">
            {[
              {
                icon: <FileText size={18} />,
                title: "Structured PRDs",
                desc: "Complete product docs with goals, metrics, and user stories",
              },
              {
                icon: <Users size={18} />,
                title: "User Stories",
                desc: "Automatically generated stories with tasks and effort estimates",
              },
              {
                icon: <BarChart3 size={18} />,
                title: "Sprint Planning",
                desc: "Tasks allocated across sprints with priority and dependency tracking",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="flex flex-col items-center text-center p-5 rounded-xl border gap-3"
                style={{
                  background: "rgba(255,255,255,0.015)",
                  borderColor: "rgba(255,255,255,0.06)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{
                    background: "rgba(94,106,210,0.12)",
                    border: "1px solid rgba(94,106,210,0.2)",
                    color: "var(--accent-bright)",
                  }}
                >
                  {feature.icon}
                </div>
                <div>
                  <p className="font-medium text-sm mb-1" style={{ color: "var(--text-primary)" }}>
                    {feature.title}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
