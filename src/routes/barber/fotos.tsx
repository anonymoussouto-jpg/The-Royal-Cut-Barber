import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Loader2, 
  Upload, 
  Star,
  CheckCircle2,
  AlertCircle,
  X
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { BeforeAfterSlider } from "@/components/ui/before-after-slider";

export const Route = createFileRoute("/barber/fotos")({
  component: BarberPhotos,
});

interface Transformation {
  id: string;
  barber_id: string;
  before_image_url: string;
  after_image_url: string;
  style_tag: string | null;
  is_highlighted: boolean | null;
  created_at: string;
}

function BarberPhotos() {
  const [transformations, setTransformations] = useState<Transformation[]>([]);
  const [loading, setLoading] = useState(true);
  const [barber, setBarber] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [styleTag, setStyleTag] = useState("");

  useEffect(() => {
    fetchBarberAndPhotos();
  }, []);

  const fetchBarberAndPhotos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: barberData } = await supabase
        .from("barbers")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();

      if (barberData) {
        setBarber(barberData);
        const { data: photos, error } = await supabase
          .from("transformations")
          .select("*")
          .eq("barber_id", barberData.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setTransformations(photos || []);
      }
    } catch (error) {
      console.error("Error fetching photos:", error);
      toast.error("Erro ao carregar galeria");
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${barber.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('transformations')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('transformations')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleAddTransformation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!beforeFile || !afterFile) {
      toast.error("Selecione ambas as fotos (Antes e Depois)");
      return;
    }

    setUploading(true);
    try {
      const beforeUrl = await uploadImage(beforeFile);
      const afterUrl = await uploadImage(afterFile);

      const { error } = await supabase.from("transformations").insert([
        {
          barber_id: barber.id,
          before_image_url: beforeUrl,
          after_image_url: afterUrl,
          style_tag: styleTag || "Geral",
          is_highlighted: false
        }
      ]);

      if (error) throw error;

      toast.success("Transformação adicionada com sucesso!");
      setIsDialogOpen(false);
      setBeforeFile(null);
      setAfterFile(null);
      setStyleTag("");
      fetchBarberAndPhotos();
    } catch (error) {
      console.error("Error adding transformation:", error);
      toast.error("Erro ao salvar transformação");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, beforeUrl: string, afterUrl: string) => {
    if (!confirm("Deseja remover esta transformação?")) return;

    try {
      // Extract paths for storage deletion
      const getPath = (url: string) => url.split('transformations/').pop();
      const beforeRes = getPath(beforeUrl);
      const afterRes = getPath(afterUrl);

      if (beforeRes && afterRes) {
        await supabase.storage.from('transformations').remove([beforeRes, afterRes]);
      }

      const { error } = await supabase.from("transformations").delete().eq("id", id);
      if (error) throw error;

      toast.success("Transformação removida");
      fetchBarberAndPhotos();
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Erro ao remover");
    }
  };

  const toggleHighlight = async (photo: Transformation) => {
    const highlightedCount = transformations.filter(t => t.is_highlighted).length;
    
    if (!photo.is_highlighted && highlightedCount >= 3) {
      toast.error("Você já possui 3 fotos em destaque. Remova uma para destacar esta.");
      return;
    }

    try {
      const { error } = await supabase
        .from("transformations")
        .update({ is_highlighted: !photo.is_highlighted })
        .eq("id", photo.id);

      if (error) throw error;
      toast.success(photo.is_highlighted ? "Removido do destaque" : "Adicionado ao destaque");
      fetchBarberAndPhotos();
    } catch (error) {
      console.error("Error highlighting:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold">Minhas Fotos</h1>
          <p className="text-white/40">Gerencie sua vitrine de transformações e trabalhos.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground font-bold rounded-xl h-12 px-6">
              <Plus className="w-4 h-4 mr-2" /> Nova Transformação
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-950 border-white/10 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif">Adicionar Trabalho</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddTransformation} className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest text-white/50">Foto Antes</Label>
                  <div className="relative aspect-square rounded-xl border-2 border-dashed border-white/10 hover:border-primary/50 transition-colors bg-white/5 overflow-hidden group">
                    {beforeFile ? (
                      <img src={URL.createObjectURL(beforeFile)} className="w-full h-full object-cover" alt="Preview Antes" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30 text-[10px] gap-2">
                        <Upload className="w-6 h-6" />
                        <span>UPLOAD ANTES</span>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => setBeforeFile(e.target.files?.[0] || null)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest text-white/50">Foto Depois</Label>
                  <div className="relative aspect-square rounded-xl border-2 border-dashed border-white/10 hover:border-primary/50 transition-colors bg-white/5 overflow-hidden group">
                    {afterFile ? (
                      <img src={URL.createObjectURL(afterFile)} className="w-full h-full object-cover" alt="Preview Depois" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30 text-[10px] gap-2">
                        <Upload className="w-6 h-6" />
                        <span>UPLOAD DEPOIS</span>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => setAfterFile(e.target.files?.[0] || null)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tag" className="text-xs uppercase tracking-widest text-white/50">Tag de Estilo</Label>
                <Input
                  id="tag"
                  placeholder="Ex: Fade, Barba, Clássico..."
                  value={styleTag}
                  onChange={(e) => setStyleTag(e.target.value)}
                  className="bg-white/5 border-white/10 h-12 rounded-xl"
                />
              </div>

              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={uploading}
                  className="w-full bg-primary text-primary-foreground font-bold h-12 rounded-xl"
                >
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Salvar Transformação"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white/5 rounded-3xl p-6 md:p-8 border border-white/10">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-primary/20 text-primary">
            <Star className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Suas Fotos em Destaque</h2>
            <p className="text-xs text-white/40">Você pode escolher até 3 fotos para aparecerem na página inicial.</p>
          </div>
        </div>

        {transformations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-white/5 rounded-2xl">
            <ImageIcon className="w-12 h-12 text-white/10 mb-4" />
            <p className="text-white/30">Nenhuma transformação cadastrada ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {transformations.map((photo) => (
              <div 
                key={photo.id} 
                className="group relative flex flex-col bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 hover:border-primary/30 transition-all"
              >
                <div className="relative aspect-video overflow-hidden">
                  <BeforeAfterSlider 
                    beforeImage={photo.before_image_url}
                    afterImage={photo.after_image_url}
                  />
                </div>
                
                <div className="p-4 flex items-center justify-between bg-zinc-950/50 backdrop-blur-sm">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                      {photo.style_tag || "Estilo Livre"}
                    </span>
                    <span className="text-[10px] text-white/30 uppercase">
                      {new Date(photo.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => toggleHighlight(photo)}
                      className={`h-9 w-9 rounded-full ${photo.is_highlighted ? "text-yellow-500 bg-yellow-500/10" : "text-white/20 hover:text-white"}`}
                    >
                      <Star className={`w-4 h-4 ${photo.is_highlighted ? "fill-current" : ""}`} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(photo.id, photo.before_image_url, photo.after_image_url)}
                      className="h-9 w-9 rounded-full text-white/20 hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {photo.is_highlighted && (
                  <div className="absolute top-4 left-4 z-20 bg-yellow-500 text-black text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded shadow-lg shadow-yellow-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> EM DESTAQUE
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
