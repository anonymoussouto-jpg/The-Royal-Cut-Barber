import { createFileRoute } from "@tanstack/react-router";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/crm")({
  component: CRMPage,
});

function CRMPage() {
  const clients = [
    { name: "João Silva", lastVisit: "12/08/2026", points: 450, status: "Ativo", plan: "Executive" },
    { name: "Pedro Santos", lastVisit: "05/08/2026", points: 120, status: "Inativo", plan: "Basic" },
    { name: "Ricardo Oliveira", lastVisit: "15/08/2026", points: 890, status: "Ativo", plan: "VIP" },
    { name: "Marcos Lima", lastVisit: "10/08/2026", points: 300, status: "Ativo", plan: "Basic" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold">CRM e Gestão de Clientes</h1>
        <p className="text-muted-foreground">Histórico, pontuação e status de assinatura.</p>
      </div>

      <div className="rounded-xl border border-border/40 overflow-hidden bg-card/50">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Última Visita</TableHead>
              <TableHead>Barber Points</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client, i) => (
              <TableRow key={i}>
                <TableCell className="font-bold">{client.name}</TableCell>
                <TableCell>{client.lastVisit}</TableCell>
                <TableCell>{client.points} pts</TableCell>
                <TableCell>{client.plan}</TableCell>
                <TableCell>
                  <Badge variant={client.status === "Ativo" ? "default" : "outline"}>
                    {client.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
