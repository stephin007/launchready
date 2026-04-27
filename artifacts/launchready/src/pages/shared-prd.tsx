import { Layout } from "@/components/layout";
import { PrdContentDisplay } from "@/components/prd-content-display";
import { useGetSharedPrd, getGetSharedPrdQueryKey } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { Loader2 } from "lucide-react";

export default function SharedPrd() {
  const params = useParams();
  const token = params.token as string;

  const { data: prd, isLoading } = useGetSharedPrd(token, {
    query: { enabled: !!token, queryKey: getGetSharedPrdQueryKey(token) }
  });

  if (isLoading) {
    return (
      <Layout isShared>
        <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)] mb-4" />
          <p className="text-[var(--text-muted)]">Loading PRD...</p>
        </div>
      </Layout>
    );
  }

  if (!prd) {
    return (
      <Layout isShared>
        <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
          <p className="text-[var(--status-danger)]">PRD not found or link is invalid.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout isShared>
      <div className="flex-1 w-full max-w-5xl mx-auto px-6 py-12">
        <PrdContentDisplay prd={prd} isShared={true} />
      </div>
    </Layout>
  );
}