import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  ShoppingBag, 
  Package, 
  Star,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  MinusCircle,
  ChevronDown
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/admin/products")({
  component: ProductsManagement,
});

function ProductsManagement() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    category: "Cabelo",
    description: "",
    price: 0,
    stock_quantity: 0,
    rating: 5.0,
    image_url: "",
    is_available: true,
  });

  const categories = ["Cabelo", "Barba", "Bigode", "Kits", "Acessórios", "Outros"];

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      toast.success("Imagem enviada com sucesso");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Erro ao enviar imagem");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSave = {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        price: Number(formData.price),
        stock_quantity: Number(formData.stock_quantity),
        image_url: formData.image_url,
        rating: Number(formData.rating),
        is_available: formData.is_available
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(dataToSave)
          .eq("id", editingProduct.id);
        if (error) throw error;
        toast.success("Produto atualizado com sucesso");
      } else {
        const { error } = await supabase
          .from("products")
          .insert([dataToSave]);
        if (error) throw error;
        toast.success("Produto criado com sucesso");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Erro ao salvar produto");
    }
  };

  const handleDelete = async () => {
    if (!isDeleting) return;
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", isDeleting);
      
      if (error) throw error;
      toast.success("Produto removido com sucesso");
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Erro ao excluir produto");
    } finally {
      setIsDeleting(null);
    }
  };

  const updateStock = async (id: string, newStock: number) => {
    if (newStock < 0) return;
    try {
      const { error } = await supabase
        .from("products")
        .update({ stock_quantity: newStock })
        .eq("id", id);
      
      if (error) throw error;
      toast.success(`Estoque atualizado: ${newStock} unidades`);
      fetchProducts();
    } catch (error) {
      console.error("Error updating stock:", error);
      toast.error("Erro ao atualizar estoque");
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category || "Cabelo",
      description: product.description || "",
      price: product.price,
      stock_quantity: product.stock_quantity,
      rating: 5.0, // Defaulting as it's not in DB
      image_url: product.image_url || "",
      is_available: product.stock_quantity > 0,
    });
    setPreviewUrl(product.image_url);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      category: "Cabelo",
      description: "",
      price: 0,
      stock_quantity: 0,
      rating: 5.0,
      image_url: "",
      is_available: true,
    });
    setPreviewUrl(null);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white">Grooming Store — Produtos</h1>
          <p className="text-white/50">Gerencie o estoque e catálogo de produtos da loja.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-black hover:bg-primary/90 font-bold px-6">
              <Plus className="w-5 h-5 mr-2" /> Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0D0D0D] border-white/10 text-white max-w-2xl overflow-y-auto max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif text-primary">
                {editingProduct ? "Editar Produto" : "Cadastrar Novo Produto"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-white/60">Nome do Produto</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="bg-white/5 border-white/10 focus:border-primary text-white"
                      placeholder="Ex: Pomada Efeito Matte 80g"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-xs font-bold uppercase tracking-wider text-white/60">Categoria</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price" className="text-xs font-bold uppercase tracking-wider text-white/60">Preço (R$)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                        required
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stock" className="text-xs font-bold uppercase tracking-wider text-white/60">Estoque</Label>
                      <Input
                        id="stock"
                        type="number"
                        value={formData.stock_quantity}
                        onChange={(e) => setFormData({ ...formData, stock_quantity: Number(e.target.value) })}
                        required
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-white/60">Imagem do Produto</Label>
                    <div className="relative group aspect-square rounded-xl overflow-hidden border-2 border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center transition-all hover:border-primary/50">
                      {previewUrl ? (
                        <>
                          <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Label htmlFor="prod-image-upload" className="cursor-pointer bg-white text-black px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider">Trocar Imagem</Label>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-white/20">
                          <ImageIcon className="w-10 h-10" />
                          <Label htmlFor="prod-image-upload" className="cursor-pointer hover:text-primary transition-colors text-xs font-bold">Selecionar Foto</Label>
                        </div>
                      )}
                      {uploading && (
                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                      )}
                      <input id="prod-image-upload" type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rating" className="text-xs font-bold uppercase tracking-wider text-white/60">Avaliação (0-5)</Label>
                      <Input
                        id="rating"
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        value={formData.rating}
                        onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div className="flex flex-col justify-end">
                       <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/10 h-10">
                          <span className="text-[10px] font-bold uppercase text-white/40">Status</span>
                          <Switch 
                            checked={formData.is_available} 
                            onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
                            className="data-[state=checked]:bg-primary"
                          />
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-white/60">Descrição Curta (Max 150 caracteres)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value.substring(0, 150) })}
                  placeholder="Explique os benefícios do produto..."
                  className="bg-white/5 border-white/10 focus:border-primary min-h-[80px] text-white"
                />
                <p className="text-right text-[10px] text-white/30 uppercase">{formData.description.length}/150</p>
              </div>

              <DialogFooter className="gap-2">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsDialogOpen(false)}
                  className="text-white hover:bg-white/5"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-primary text-black hover:bg-primary/90 font-bold px-8"
                  disabled={uploading}
                >
                  {editingProduct ? "Salvar Alterações" : "Criar Produto"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-card/30 p-4 rounded-2xl border border-white/5">
        <div className="relative flex-grow w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input 
            placeholder="Buscar por nome do produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 bg-white/5 border-white/10 focus:border-primary w-full text-white"
          />
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full md:w-[200px] bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
            <SelectItem value="all">Todas Categorias</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-primary font-bold uppercase tracking-widest animate-pulse">Carregando estoque...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-card/20 rounded-3xl border border-white/5">
          <Package className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/30 uppercase tracking-[0.2em] font-bold">Nenhum produto em estoque</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div 
              key={product.id} 
              className="group bg-[#0F0F0F] rounded-2xl border border-white/5 overflow-hidden transition-all hover:border-primary/30"
            >
              <div className="aspect-square relative overflow-hidden bg-white/5">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-12 h-12 text-white/5" />
                  </div>
                )}
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                   <Badge className="bg-black/80 backdrop-blur-md text-primary border-primary/20 text-[8px] font-black uppercase tracking-widest">
                    {product.category || "Geral"}
                  </Badge>
                  <div className="flex items-center gap-1 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10">
                    <Star className="w-2 h-2 text-yellow-500 fill-yellow-500" />
                    <span className="text-[9px] font-bold text-white">5.0</span>
                  </div>
                </div>
                
                {product.stock_quantity <= 5 && product.stock_quantity > 0 && (
                  <Badge className="absolute top-3 right-3 bg-orange-500 text-black border-none text-[8px] font-black uppercase animate-pulse">
                    Estoque Baixo
                  </Badge>
                )}
                {product.stock_quantity === 0 && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                    <Badge variant="destructive" className="bg-red-600 text-white font-black uppercase text-xs tracking-widest py-1 px-4">Esgotado</Badge>
                  </div>
                )}
              </div>
              
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="text-md font-bold text-white line-clamp-1 group-hover:text-primary transition-colors">{product.name}</h3>
                  <p className="text-[10px] text-white/30 line-clamp-2 mt-1 min-h-[30px]">{product.description || "Shampoo profissional para cuidados masculinos."}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-white/30 uppercase font-black tracking-widest">Preço</span>
                    <span className="text-md font-bold text-primary">R$ {product.price.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] text-white/30 uppercase font-black tracking-widest">Qtd</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${product.stock_quantity === 0 ? 'text-red-500' : 'text-white'}`}>
                        {product.stock_quantity}
                      </span>
                      
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-6 h-6 rounded-full bg-white/5 hover:bg-primary/20 text-white/40 hover:text-primary">
                            <ChevronDown className="w-3 h-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-40 bg-[#1A1A1A] border-white/10 text-white p-2">
                          <div className="flex items-center justify-between gap-2">
                             <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-red-400 hover:bg-red-400/10"
                              onClick={() => updateStock(product.id, product.stock_quantity - 1)}
                            >
                              <MinusCircle className="h-4 w-4" />
                            </Button>
                            <span className="text-xs font-bold">{product.stock_quantity}</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-green-400 hover:bg-green-400/10"
                              onClick={() => updateStock(product.id, product.stock_quantity + 1)}
                            >
                              <PlusCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button 
                    variant="ghost" 
                    className="flex-grow bg-white/5 hover:bg-primary/10 hover:text-primary text-[9px] font-bold uppercase tracking-widest h-8"
                    onClick={() => handleEdit(product)}
                  >
                    <Edit2 className="w-3 h-3 mr-2" /> Editar
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="bg-red-500/5 hover:bg-red-500/10 text-red-500 text-[9px] font-bold uppercase tracking-widest h-8"
                    onClick={() => setIsDeleting(product.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!isDeleting} onOpenChange={(open) => !open && setIsDeleting(null)}>
        <AlertDialogContent className="bg-[#0D0D0D] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-serif text-red-500">Remover Produto?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Esta ação removerá o produto permanentemente da Grooming Store. Clientes com o item no carrinho não conseguirão finalizar a compra.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-500 text-white hover:bg-red-600 font-bold"
            >
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
