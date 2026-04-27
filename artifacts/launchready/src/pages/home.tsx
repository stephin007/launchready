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
      onError: (error) => {
        toast({
          title: "Generation failed",
          description: error.error || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    });
  }

  return (
    <Layout>
      <div className="flex-1 w-full max-w-2xl mx-auto px-6 py-16 flex flex-col">
        <div className="mb-12 text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-[var(--text-primary)]">
            Turn your idea into an engineering-ready plan in 30 seconds.
          </h1>
          <p className="text-lg text-[var(--text-muted)] max-w-lg mx-auto">
            Answer three questions. Get a complete Product Requirements Document with user stories, estimated effort, and sprint allocations.
          </p>
        </div>

        <div className="bg-[rgba(255,255,255,0.02)] border border-[var(--border-default)] rounded-xl p-6 md:p-8 shadow-[rgba(0,0,0,0.4)_0px_2px_4px]">
          {generatePrd.isPending ? (
            <div className="h-[400px] flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in duration-500">
              <div className="w-16 h-16 rounded-full bg-[rgba(113,112,255,0.1)] flex items-center justify-center mb-4">
                <Loader2 className="w-8 h-8 text-[var(--accent-bright)] animate-spin" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-medium text-[var(--text-primary)] transition-all duration-300">
                  {LOADING_MESSAGES[loadingStep]}
                </h3>
                <p className="text-[var(--text-muted)] text-sm">
                  This usually takes about 30 seconds.
                </p>
              </div>
            </div>
          ) : (
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
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-[var(--status-danger)]" />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-base font-medium h-12"
                  data-testid="button-generate"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate PRD
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </form>
            </Form>
          )}
        </div>
      </div>
    </Layout>
  );
}