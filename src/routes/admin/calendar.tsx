import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/calendar")({
  component: () => (
    <div className="space-y-8">
      <h1 className="text-3xl font-serif font-bold">Controle de Agenda Geral</h1>
      <p className="text-muted-foreground">Visualização completa de todos os barbeiros e horários.</p>
      <div className="aspect-video rounded-3xl border border-dashed border-border/40 flex items-center justify-center bg-card/20">
        <span className="text-muted-foreground italic text-sm">Calendário visual em construção...</span>
      </div>
    </div>
  )
});
