import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/staff")({
  component: () => (
    <div className="space-y-8">
      <h1 className="text-3xl font-serif font-bold">Gestão de Colaboradores</h1>
      <p className="text-muted-foreground">Cadastro e horários dos profissionais.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-6 rounded-2xl border border-border/40 bg-card/50">
             <div className="w-16 h-16 rounded-full bg-primary/20 mb-4" />
             <h3 className="font-bold text-lg">Barbeiro Profissional {i}</h3>
             <p className="text-sm text-muted-foreground mb-4">Especialista em Fade e Barboterapia</p>
             <div className="text-xs py-1 px-3 rounded-full bg-primary/10 text-primary w-fit font-bold">Ativo</div>
          </div>
        ))}
      </div>
    </div>
  )
});
