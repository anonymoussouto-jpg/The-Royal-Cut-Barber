import { Tables } from "@/integrations/supabase/types";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Scissors,
  Loader2,
  Zap,
  DollarSign,
  UserCheck,
  Shield,
  MoreVertical,
  CheckCircle2,
  Check,
  XCircle,
  Phone,
  Filter,
  CalendarDays,
} from "lucide-react";
import { format, isSameDay, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/calendar")({
  component: AdminCalendar,
});

function AdminCalendar() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [barbers, setBarbers] = useState<Tables<"barbers">[]>([]);
  const [services, setServices] = useState<Tables<"services">[]>([]);
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [cancellingAppId, setCancellingAppId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Filtros
  const [filterDate, setFilterDate] = useState<Date | undefined>(new Date());
  const [filterBarber, setFilterBarber] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [walkInData, setWalkInData] = useState({
    client_name: "",
    phone: "",
    service_id: "",
    barber_id: "",
  });

  useEffect(() => {
    fetchAppointments();
    fetchBarbersAndServices();

    const channel = supabase
      .channel("calendar-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => {
        fetchAppointments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [filterBarber]);

  const fetchBarbersAndServices = async () => {
    const [barbersRes, servicesRes] = await Promise.all([
      supabase.from("barbers").select("*"),
      supabase.from("services").select("*"),
    ]);
    if (barbersRes.data) setBarbers(barbersRes.data);
    if (servicesRes.data) setServices(servicesRes.data);
  };

  const fetchAppointments = async () => {
    try {
      let query = supabase
        .from("appointments")
        .select(
          `
          *,
          profiles(full_name, phone),
          barbers(full_name),
          services(name, price, owner_percentage, barber_percentage)
        `,
        );

      if (filterBarber !== "all") {
        query = query.eq("barber_id", filterBarber);
      }

      const { data, error } = await query.order("start_time", { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error("Calendar error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string, additionalData = {}) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: newStatus, ...additionalData })
        .eq("id", id);

      if (error) throw error;

      // Dar 10 pontos automaticamente ao concluir
      if (newStatus === "completed") {
        const appointment = appointments.find((a) => a.id === id);
        const POINTS_PER_SERVICE = 10;

        if (appointment && appointment.client_id && !appointment.is_guest) {
          await supabase.rpc("increment_barber_points", {
            p_user_id: appointment.client_id,
            p_points: POINTS_PER_SERVICE,
          });
          console.log(`Pontos concedidos ao cliente ${appointment.client_id}`);
        }
      }

      toast.success(
        `Agendamento ${newStatus === "confirmed" ? "confirmado" : newStatus === "completed" ? "concluído" : "atualizado"}!`,
      );
      fetchAppointments();
    } catch (error) {
      toast.error("Erro ao atualizar agendamento");
    }
  };

  const handleWalkIn = async () => {
    if (!walkInData.client_name || !walkInData.service_id || !walkInData.barber_id) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    try {
      const service = services.find((s) => s.id === walkInData.service_id);

      // Upsert profile based on phone
      let clientId: string;
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", walkInData.phone)
        .maybeSingle();

      if (existingProfile) {
        clientId = existingProfile.id;
      } else {
        const newId = uuidv4();
        const { error: profileError } = await supabase.from("profiles").insert({
          id: newId,
          full_name: walkInData.client_name,
          phone: walkInData.phone || null,
          is_guest: true,
        });
        if (profileError) throw profileError;
        clientId = newId;
      }

      const appToInsert: any = {
        client_id: clientId,
        barber_id: walkInData.barber_id,
        service_id: walkInData.service_id,
        start_time: new Date().toISOString(),
        status: "confirmed",
        payment_status: "pending",
        total_price: service?.price || 0,
        client_name: walkInData.client_name,
        client_phone: walkInData.phone || null,
      };

      const { error: appError } = await supabase.from("appointments").insert(appToInsert);

      if (appError) throw appError;

      toast.success("Atendimento walk-in registrado!");
      setIsWalkInOpen(false);
      setWalkInData({ client_name: "", phone: "", service_id: "", barber_id: "" });
      fetchAppointments();
    } catch (error) {
      console.error("Walk-in error:", error);
      toast.error("Erro ao registrar atendimento");
    }
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter((app) => {
      const appDate = new Date(app.start_time);

      const matchesDate = !filterDate || isSameDay(appDate, filterDate);
      const matchesBarber = filterBarber === "all" || app.barber_id === filterBarber;
      const matchesStatus = filterStatus === "all" || app.status === filterStatus;

      return matchesDate && matchesBarber && matchesStatus;
    });
  }, [appointments, filterDate, filterBarber, filterStatus]);

  const stats = useMemo(() => {
    return {
      pending: filteredAppointments.filter((a) => a.status === "pending").length,
      confirmed: filteredAppointments.filter((a) => a.status === "confirmed").length,
      completed: filteredAppointments.filter((a) => a.status === "completed").length,
      cancelled: filteredAppointments.filter((a) => a.status === "cancelled").length,
    };
  }, [filteredAppointments]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "border-yellow-500";
      case "confirmed":
        return "border-blue-500";
      case "completed":
        return "border-green-500";
      case "cancelled":
        return "border-red-500/50";
      default:
        return "border-border/40";
    }
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-primary font-bold uppercase tracking-widest text-xs">
          Carregando Agenda...
        </p>
      </div>
    );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white">Controle de Agenda Geral</h1>
          <p className="text-white/50">Visualização e gestão operacional de todos os horários.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            <Badge
              variant="outline"
              className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 px-3 py-1 text-[10px] font-bold uppercase"
            >
              {stats.pending} Pendentes
            </Badge>
            <Badge
              variant="outline"
              className="bg-blue-500/10 text-blue-500 border-blue-500/20 px-3 py-1 text-[10px] font-bold uppercase"
            >
              {stats.confirmed} Confirmados
            </Badge>
            <Badge
              variant="outline"
              className="bg-green-500/10 text-green-500 border-green-500/20 px-3 py-1 text-[10px] font-bold uppercase"
            >
              {stats.completed} Concluídos
            </Badge>
            <Badge
              variant="outline"
              className="bg-red-500/10 text-red-500 border-red-500/20 px-3 py-1 text-[10px] font-bold uppercase"
            >
              {stats.cancelled} Cancelados
            </Badge>
          </div>

          <Dialog open={isWalkInOpen} onOpenChange={setIsWalkInOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-black font-bold uppercase tracking-widest text-xs h-10 px-6 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2">
                <Zap className="w-4 h-4" />⚡ Atendimento Imediato
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0A0A0A] border-white/10 text-white max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-serif font-bold text-primary flex items-center gap-2">
                  <Zap className="w-6 h-6" />
                  Atendimento Walk-in
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-white/40">
                    Nome do Cliente *
                  </Label>
                  <Input
                    className="bg-white/5 border-white/10 focus:border-primary text-white"
                    placeholder="Nome completo"
                    value={walkInData.client_name}
                    onChange={(e) => setWalkInData({ ...walkInData, client_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-white/40">Telefone</Label>
                  <Input
                    className="bg-white/5 border-white/10 focus:border-primary text-white"
                    placeholder="(00) 00000-0000"
                    value={walkInData.phone}
                    onChange={(e) => setWalkInData({ ...walkInData, phone: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-white/40">Serviço *</Label>
                    <Select
                      onValueChange={(val) => setWalkInData({ ...walkInData, service_id: val })}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                        {services.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} - R${s.price}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-white/40">Barbeiro *</Label>
                    <Select
                      onValueChange={(val) => setWalkInData({ ...walkInData, barber_id: val })}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                        {barbers.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleWalkIn}
                  className="w-full bg-primary text-black font-black uppercase tracking-widest"
                >
                  Confirmar Agora
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col lg:flex-row gap-4 items-center bg-[#0F0F0F] p-4 rounded-2xl border border-white/5">
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-4 h-4 text-white/20" />
          <span className="text-[10px] uppercase font-bold text-white/20 tracking-widest">
            Filtros
          </span>
        </div>

        <div className="flex flex-wrap gap-4 items-center flex-grow">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="bg-white/5 border-white/10 text-white text-xs h-9 justify-start font-normal w-[180px]"
              >
                <CalendarDays className="mr-2 h-4 w-4 text-primary" />
                {filterDate
                  ? format(filterDate, "dd 'de' MMMM", { locale: ptBR })
                  : "Selecionar data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-[#0F0F0F] border-white/10" align="start">
              <Calendar
                mode="single"
                selected={filterDate}
                onSelect={setFilterDate}
                initialFocus
                className="text-white"
              />
            </PopoverContent>
          </Popover>

          <Select value={filterBarber} onValueChange={setFilterBarber}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs h-9 w-[180px]">
              <SelectValue placeholder="Barbeiro" />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
              <SelectItem value="all">Todos Barbeiros</SelectItem>
              {barbers.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/10">
            {["all", "pending", "confirmed", "completed", "cancelled"].map((status) => (
              <Badge
                key={status}
                variant={filterStatus === status ? "default" : "outline"}
                className={`cursor-pointer px-3 py-1 text-[9px] uppercase font-bold tracking-widest transition-all ${
                  filterStatus === status
                    ? "bg-primary text-black"
                    : "text-white/40 hover:text-white"
                }`}
                onClick={() => setFilterStatus(status)}
              >
                {status === "all"
                  ? "Todos"
                  : status === "pending"
                    ? "Pendentes"
                    : status === "confirmed"
                      ? "Confirmados"
                      : status === "completed"
                        ? "Concluídos"
                        : "Cancelados"}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de Agendamentos */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-serif font-bold text-white">Agendamentos do Dia</h2>
        <div className="flex gap-2 ml-auto">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="text-xs"
          >
            ☰ Lista
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="text-xs"
          >
            ⏱ Grade
          </Button>
        </div>
      </div>

      {viewMode === "grid" && (
        <div className="rounded-xl border border-white/10 overflow-hidden bg-zinc-950">
          {["09:00","09:30","10:00","10:30","11:00","11:30","13:00","13:30",
            "14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30",
            "18:00","18:30","19:00","19:30"].map(slot => {
            const appt = filteredAppointments?.find(a => {
              const t = new Date(a.start_time);
              return `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,
    '0')}` === slot;
            });

            return (
              <div key={slot} className={`flex items-stretch min-h-[52px] border-b border-white/5
    last:border-0 ${appt ? 'bg-primary/5' : 'bg-transparent'}`}>
                <div className="w-16 flex items-center justify-center text-xs text-white/40
    border-r border-white/5 px-2 shrink-0 font-mono">
                  {slot}
                </div>
                <div className="flex-1 p-1.5">
                  {appt ? (
                    <div className={`p-2 rounded-lg text-xs font-medium h-full flex items-center gap-2
    ${
                      appt.status === 'confirmed' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                      appt.status === 'cancelled' ? 'bg-red-500/10 text-red-400/60 line-through' :
                      appt.status === 'completed' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                      'bg-primary/20 text-primary border border-primary/30'
                    }`}>
                      <span className="font-bold">{appt.client_name}</span>
                      <span className="text-white/40">—</span>
                      <span>{appt.services?.name || 'Serviço'}</span>
                      <span className="ml-auto opacity-60">{appt.barbers?.full_name}</span>
                    </div>
                  ) : (
                    <div className="h-full flex items-center pl-2 text-xs text-white/10 italic">disponível</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className={`grid gap-4 ${viewMode !== 'list' ? 'hidden' : ''}`}>
        {filteredAppointments.length === 0 ? (
          <div className="py-20 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center bg-white/5 gap-3">
            <CalendarDays className="w-12 h-12 text-white/10" />
            <span className="text-white/30 uppercase tracking-widest font-bold text-sm">
              Nenhum agendamento para este filtro.
            </span>
          </div>
        ) : (
          filteredAppointments.map((app) => {
            const totalPrice = app.total_price || 0;
            const statusColor = getStatusColor(app.status);
            const isCancelled = app.status === "cancelled";

            return (
              <Card
                key={app.id}
                className={`border-border/40 bg-[#0D0D0D] transition-all group border-l-4 ${statusColor} ${isCancelled ? "opacity-50" : ""}`}
              >
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-center gap-4 shrink-0">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-colors ${
                          isCancelled
                            ? "bg-white/5 border-white/10 text-white/20"
                            : "bg-primary/10 border-primary/20 text-primary"
                        }`}
                      >
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-base text-white">
                          {format(new Date(app.start_time), "HH:mm")}
                        </h4>
                        <div className="text-[10px] text-white/40 uppercase font-bold tracking-widest">
                          {format(new Date(app.start_time), "dd MMM")}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow px-0 lg:px-8 border-l border-white/5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] text-white/20 uppercase font-bold tracking-widest flex items-center gap-1">
                          <User className="w-2.5 h-2.5" /> Cliente
                        </span>
                        <span className="text-sm font-bold text-white truncate">
                          {app.profiles?.full_name || app.client_name || "Desconhecido"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] text-white/20 uppercase font-bold tracking-widest flex items-center gap-1">
                          <Scissors className="w-2.5 h-2.5" /> Serviço
                        </span>
                        <span className="text-sm font-bold text-white truncate">
                          {app.services?.name}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] text-white/20 uppercase font-bold tracking-widest flex items-center gap-1">
                          <UserCheck className="w-2.5 h-2.5" /> Profissional
                        </span>
                        <span className="text-sm font-bold text-primary truncate">
                          {app.barbers?.full_name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0 border-l border-white/5 pl-6">
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] text-white/20 uppercase font-bold tracking-widest">
                          Valor
                        </span>
                        <span className="text-base font-serif font-black text-white">
                          R$ {totalPrice.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end gap-2">
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-black uppercase tracking-widest py-1 px-3 border-white/10 ${
                              app.status === "confirmed"
                                ? "text-blue-400 bg-blue-500/5"
                                : app.status === "completed"
                                  ? "text-green-400 bg-green-500/5"
                                  : app.status === "cancelled"
                                    ? "text-red-400 bg-red-500/5"
                                    : "text-yellow-400 bg-yellow-500/5"
                            }`}
                          >
                            {app.status === "confirmed"
                              ? "Confirmado"
                              : app.status === "completed"
                                ? "Concluído"
                                : app.status === "cancelled"
                                  ? "Cancelado"
                                  : "Pendente"}
                          </Badge>
                          
                          {!isCancelled && app.status !== "completed" && (
                            <div className="flex gap-1">
                              {app.status === "pending" && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-lg"
                                  onClick={() => handleUpdateStatus(app.id, "confirmed")}
                                  title="Confirmar"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg"
                                onClick={() => handleUpdateStatus(app.id, "completed")}
                                title="Concluir"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg"
                                onClick={() => handleUpdateStatus(app.id, "cancelled")}
                                title="Cancelar"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-white/40 hover:text-white hover:bg-white/5"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            className="bg-[#1A1A1A] border-white/10 text-white w-52"
                            align="end"
                          >
                            {app.status === "pending" && (
                              <DropdownMenuItem
                                className="flex items-center gap-2 py-3 cursor-pointer hover:bg-white/5 text-blue-400"
                                onClick={() => handleUpdateStatus(app.id, "confirmed")}
                              >
                                <CheckCircle2 className="w-4 h-4" /> Confirmar Agendamento
                              </DropdownMenuItem>
                            )}

                            {app.status !== "completed" && app.status !== "cancelled" && (
                              <>
                                <DropdownMenuItem
                                  className="flex items-center gap-2 py-3 cursor-pointer hover:bg-white/5 text-green-500"
                                  onClick={() =>
                                    handleUpdateStatus(app.id, "completed", {
                                      payment_status: "paid",
                                    })
                                  }
                                >
                                  <Check className="w-4 h-4" /> Marcar como Concluído
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="flex items-center gap-2 py-3 cursor-pointer hover:bg-white/5 text-primary"
                                  onClick={() =>
                                    handleUpdateStatus(app.id, app.status, {
                                      payment_status: "paid",
                                    })
                                  }
                                >
                                  <DollarSign className="w-4 h-4" /> Confirmar Pagamento
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/5" />
                              </>
                            )}

                            <DropdownMenuItem
                              className="flex items-center gap-2 py-3 cursor-pointer hover:bg-green-500/10 text-green-500"
                              onClick={() => {
                                const phone = app.profiles?.phone || app.client_phone;
                                const name =
                                  app.profiles?.full_name || app.client_name || "Cliente";
                                if (phone) {
                                  const text = `Olá ${name}, lembrete: seu horário na The Royal Cut é em breve. Confirma presença? ✂️`;
                                  window.open(
                                    `https://wa.me/55${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`,
                                    "_blank",
                                  );
                                } else toast.error("Telefone não cadastrado");
                              }}
                            >
                              <Phone className="w-4 h-4" /> 📱 WhatsApp
                            </DropdownMenuItem>

                            {app.status !== "cancelled" && (
                              <DropdownMenuItem
                                className="flex items-center gap-2 py-3 cursor-pointer hover:bg-red-500/10 text-red-500"
                                onClick={() => setCancellingAppId(app.id)}
                              >
                                <XCircle className="w-4 h-4" /> Cancelar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Dialog de Cancelamento */}
      <AlertDialog
        open={!!cancellingAppId}
        onOpenChange={(open) => !open && setCancellingAppId(null)}
      >
        <AlertDialogContent className="bg-[#0D0D0D] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-serif text-red-500">
              Cancelar Agendamento?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Esta ação marcará o agendamento como cancelado. O horário ficará disponível novamente
              no site público.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              Voltar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancellingAppId && handleUpdateStatus(cancellingAppId, "cancelled")}
              className="bg-red-500 text-white hover:bg-red-600 font-bold"
            >
              Confirmar Cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
