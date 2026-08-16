import { createFileRoute } from "@tanstack/react-router";
import PublicLayout from "@/components/layout/PublicLayout";

export const Route = createFileRoute("/services")({
  component: () => (
    <PublicLayout>
      <div className="container mx-auto px-6 py-12">
        <h1 className="text-4xl font-serif font-bold mb-4">Serviços & Experiências</h1>
        <p className="text-muted-foreground italic">Página em construção - Confira nossa Home para destaques.</p>
      </div>
    </PublicLayout>
  )
});
