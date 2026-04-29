import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGeneratePrd } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const formSchema = z.object({
  problem: z.string().min(10, "Please provide more detail about the problem."),
  audience: z.string().min(5, "Please describe the target audience."),
  success: z.string().min(10, "Please describe what success looks like."),
  productName: z.string().optional(),
});

const LOADING_MESSAGES = [
  "Reading your idea...",
  "Analyzing target audience...",
  "Defining success criteria...",
  "Drafting user stories...",
  "Estimating engineering effort...",
  "Allocating sprints...",
  "Finalizing PRD..."
];

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const generatePrd = useGeneratePrd();
  const [loadingStep, setLoadingStep] = useState(0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      problem: "",
      audience: "",
      success: "",
      productName: "",
    },
  });

  useEffect(() => {
    if (!generatePrd.isPending) return;
    
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);
    
    return () => clearInterval(interval);
  }, [generatePrd.isPending]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    generatePrd.mutate({ data: values }, {
      onSuccess: (prd) => {
        setLocation(`/prd/${prd.id}`);
      },
      onError: () => {
        toast({
          title: "Generation failed",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
    });
  }

  return (
    <Layout>
      <div className="flex-1 w-full max-w-2xl mx-auto px-6 flex flex-col">

        {/* Hero section */}
        <div className="pt-20 pb-14 text-center flex flex-col items-center">
          {/* Glow behind headline */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "10%",
              left: "50%",
              transform: "translateX(-50%)",
              width: "600px",
              height: "300px",
              background: "radial-gradient(ellipse at center, rgba(94,106,210,0.18) 0%, rgba(94,106,210,0.06) 50%, transparent 75%)",
              filter: "blur(32px)",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />

          <div className="relative z-10 space-y-5">
            <h1
              className="text-4xl md:text-[3.25rem] leading-[1.1] font-medium tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              From idea to{" "}
              <span style={{ whiteSpace: "nowrap" }}>engineering-ready</span>
              <br />
              plan in 30 seconds
            </h1>

            <p className="text-lg max-w-xl mx-auto leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Answer 3 questions. Get a complete PRD, user stories, sprint plan and engineering tasks — instantly.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {["AI-Generated PRDs", "Sprint Allocation", "Shareable Links"].map((label) => (
                <span
                  key={label}
                  style={{
                    background: "rgba(94,106,210,0.10)",
                    border: "1px solid rgba(94,106,210,0.28)",
                    color: "var(--accent-bright)",
                    fontSize: "0.8125rem",
                    fontWeight: 500,
                    padding: "4px 12px",
                    borderRadius: "999px",
                    letterSpacing: "0.01em",
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-[rgba(255,255,255,0.02)] border border-[var(--border-default)] rounded-xl p-6 md:p-8 shadow-[rgba(0,0,0,0.4)_0px_2px_4px] mb-16">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="problem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base text-[var(--text-primary)]">What problem does your feature solve?</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g. Users struggle to track their daily water intake because existing apps are too complex."
                        className="min-h-[100px] bg-[rgba(255,255,255,0.02)] border-[var(--border-default)] focus-visible:ring-[var(--accent)] resize-y text-base"
                        disabled={generatePrd.isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-[var(--status-danger)]" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="audience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base text-[var(--text-primary)]">Who is this feature for?</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g. Health-conscious professionals who want a simple, one-tap way to log water."
                        className="min-h-[100px] bg-[rgba(255,255,255,0.02)] border-[var(--border-default)] focus-visible:ring-[var(--accent)] resize-y text-base"
                        disabled={generatePrd.isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-[var(--status-danger)]" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="success"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base text-[var(--text-primary)]">What does success look like for this feature?</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g. 80% of users who log water once return to log it again the next day."
                        className="min-h-[100px] bg-[rgba(255,255,255,0.02)] border-[var(--border-default)] focus-visible:ring-[var(--accent)] resize-y text-base"
                        disabled={generatePrd.isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-[var(--status-danger)]" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="productName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[var(--text-secondary)]">Product name <span className="text-[var(--text-muted)] font-normal">(optional)</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. HydroTrack"
                        className="bg-[rgba(255,255,255,0.02)] border-[var(--border-default)] focus-visible:ring-[var(--accent)] text-base"
                        disabled={generatePrd.isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-[var(--status-danger)]" />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <Button
                  type="submit"
                  size="lg"
                  disabled={generatePrd.isPending}
                  className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-base font-medium h-12 disabled:opacity-80"
                  data-testid="button-generate"
                >
                  {generatePrd.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate PRD
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>

                {generatePrd.isPending && (
                  <p className="text-center text-sm text-[var(--text-muted)] animate-pulse">
                    {LOADING_MESSAGES[loadingStep]}
                  </p>
                )}
              </div>
            </form>
          </Form>
        </div>
      </div>
    </Layout>
  );
}