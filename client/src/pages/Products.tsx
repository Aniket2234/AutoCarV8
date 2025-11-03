import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Package, X, ImagePlus, Barcode, Trash2, ImageIcon, Download, Upload, Copy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import * as XLSX from "xlsx";
import { VEHICLE_DATA } from "@shared/vehicleData";

export default function Products() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [stockFormData, setStockFormData] = useState({
    quantity: "",
    type: "IN",
    reason: "",
  });
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    category: "",
    mrp: "",
    sellingPrice: "",
    discount: "",
    stockQty: "",
    minStockLevel: "",
    warehouseLocation: "",
    barcode: "",
    warranty: "",
    images: [""],
    modelCompatibility: [""],
    variants: [{ size: "", color: "" }],
  });

  const { data: products = [], isLoading, error, refetch } = useQuery<any[]>({
    queryKey: ["/api/products"],
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/products', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Product created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create product",
        variant: "destructive",
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PATCH', `/api/products/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setIsEditDialogOpen(false);
      setSelectedProduct(null);
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update product",
        variant: "destructive",
      });
    },
  });

  const updateStockMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/inventory-transactions', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory-transactions'] });
      setIsStockDialogOpen(false);
      setSelectedProduct(null);
      setStockFormData({ quantity: "", type: "IN", reason: "" });
      toast({
        title: "Success",
        description: "Stock updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update stock",
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/products/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setIsDeleteDialogOpen(false);
      setSelectedProduct(null);
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive",
      });
    },
  });

  const deleteDuplicatesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/products/delete-duplicates', {});
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Success",
        description: `Deleted ${data.deletedCount} duplicate products from ${data.duplicateGroups} groups`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete duplicates",
        variant: "destructive",
      });
    },
  });

  const importProductsMutation = useMutation({
    mutationFn: async (productsData: any[]) => {
      const response = await apiRequest('POST', '/api/products/import', { products: productsData });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Success",
        description: `Imported ${data.imported} products. ${data.errors > 0 ? `${data.errors} errors occurred.` : ''}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to import products",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      brand: "",
      category: "",
      mrp: "",
      sellingPrice: "",
      discount: "",
      stockQty: "",
      minStockLevel: "",
      warehouseLocation: "",
      barcode: "",
      warranty: "",
      images: [""],
      modelCompatibility: [""],
      variants: [{ size: "", color: "" }],
    });
  };

  const addImage = () => {
    setFormData({ ...formData, images: [...formData.images, ""] });
  };

  const removeImage = (index: number) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData({ ...formData, images: newImages.length > 0 ? newImages : [""] });
  };

  const updateImage = (index: number, value: string) => {
    const newImages = [...formData.images];
    newImages[index] = value;
    setFormData({ ...formData, images: newImages });
  };

  const addModelCompat = () => {
    setFormData({ ...formData, modelCompatibility: [...formData.modelCompatibility, ""] });
  };

  const removeModelCompat = (index: number) => {
    const newModels = formData.modelCompatibility.filter((_, i) => i !== index);
    setFormData({ ...formData, modelCompatibility: newModels.length > 0 ? newModels : [""] });
  };

  const updateModelCompat = (index: number, value: string) => {
    const newModels = [...formData.modelCompatibility];
    newModels[index] = value;
    setFormData({ ...formData, modelCompatibility: newModels });
  };

  const addVariant = () => {
    setFormData({ ...formData, variants: [...formData.variants, { size: "", color: "" }] });
  };

  const removeVariant = (index: number) => {
    const newVariants = formData.variants.filter((_, i) => i !== index);
    setFormData({ ...formData, variants: newVariants.length > 0 ? newVariants : [{ size: "", color: "" }] });
  };

  const updateVariant = (index: number, field: 'size' | 'color', value: string) => {
    const newVariants = [...formData.variants];
    newVariants[index][field] = value;
    setFormData({ ...formData, variants: newVariants });
  };

  const handleExportProducts = () => {
    const exportData = products.map(product => ({
      name: product.name,
      brand: product.brand,
      category: product.category,
      mrp: product.mrp,
      sellingPrice: product.sellingPrice,
      discount: product.discount,
      stockQty: product.stockQty,
      minStockLevel: product.minStockLevel,
      warehouseLocation: product.warehouseLocation || "",
      barcode: product.barcode || "",
      warranty: product.warranty || "",
      status: product.status,
      modelCompatibility: Array.isArray(product.modelCompatibility) ? product.modelCompatibility.join(", ") : "",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    
    const fileName = `products_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast({
      title: "Success",
      description: `Exported ${products.length} products to ${fileName}`,
    });
  };

  const handleImportProducts = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const productsData = jsonData.map((row: any) => ({
          name: row.name || row.Name,
          brand: row.brand || row.Brand,
          category: row.category || row.Category,
          mrp: row.mrp || row.MRP || 0,
          sellingPrice: row.sellingPrice || row.SellingPrice || row.selling_price || 0,
          discount: row.discount || row.Discount || 0,
          stockQty: row.stockQty || row.StockQty || row.stock_qty || 0,
          minStockLevel: row.minStockLevel || row.MinStockLevel || row.min_stock_level || 10,
          warehouseLocation: row.warehouseLocation || row.WarehouseLocation || row.warehouse_location || "",
          barcode: row.barcode || row.Barcode || "",
          warranty: row.warranty || row.Warranty || "",
          modelCompatibility: row.modelCompatibility 
            ? (typeof row.modelCompatibility === 'string' ? row.modelCompatibility.split(",").map((s: string) => s.trim()) : [])
            : [],
        }));

        importProductsMutation.mutate(productsData);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to parse Excel file. Please check the format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    
    const mrp = parseFloat(formData.mrp);
    const sellingPrice = parseFloat(formData.sellingPrice);
    const discount = parseFloat(formData.discount) || 0;
    const stockQty = parseInt(formData.stockQty);
    const minStockLevel = parseInt(formData.minStockLevel);
    
    if (!formData.name || !formData.brand || !formData.category) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    if (isNaN(mrp) || mrp <= 0 || isNaN(sellingPrice) || sellingPrice <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter valid prices greater than 0",
        variant: "destructive",
      });
      return;
    }
    
    if (isNaN(stockQty) || stockQty < 0 || isNaN(minStockLevel) || minStockLevel < 0) {
      toast({
        title: "Validation Error",
        description: "Please enter valid stock quantities",
        variant: "destructive",
      });
      return;
    }
    
    const productData = {
      name: formData.name,
      brand: formData.brand,
      category: formData.category,
      mrp,
      sellingPrice,
      discount,
      stockQty,
      minStockLevel,
      warehouseLocation: formData.warehouseLocation,
      barcode: formData.barcode,
      warranty: formData.warranty,
      images: formData.images.filter(img => img.trim() !== ""),
      modelCompatibility: formData.modelCompatibility.filter(m => m.trim() !== ""),
      variants: formData.variants.filter(v => v.size || v.color),
    };
    
    createProductMutation.mutate(productData);
  };

  const handleEditProduct = (product: any) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name || "",
      brand: product.brand || "",
      category: product.category || "",
      mrp: product.mrp?.toString() || "",
      sellingPrice: product.sellingPrice?.toString() || "",
      discount: product.discount?.toString() || "0",
      stockQty: product.stockQty?.toString() || "",
      minStockLevel: product.minStockLevel?.toString() || "",
      warehouseLocation: product.warehouseLocation || "",
      barcode: product.barcode || "",
      warranty: product.warranty || "",
      images: (product.images && product.images.length > 0) ? product.images : [""],
      modelCompatibility: (product.modelCompatibility && product.modelCompatibility.length > 0) ? product.modelCompatibility : [""],
      variants: (product.variants && product.variants.length > 0) ? product.variants : [{ size: "", color: "" }],
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    
    const mrp = parseFloat(formData.mrp);
    const sellingPrice = parseFloat(formData.sellingPrice);
    const discount = parseFloat(formData.discount) || 0;
    const stockQty = parseInt(formData.stockQty);
    const minStockLevel = parseInt(formData.minStockLevel);
    
    if (!formData.name || !formData.brand || !formData.category) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    if (isNaN(mrp) || mrp <= 0 || isNaN(sellingPrice) || sellingPrice <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter valid prices greater than 0",
        variant: "destructive",
      });
      return;
    }
    
    if (isNaN(stockQty) || stockQty < 0 || isNaN(minStockLevel) || minStockLevel < 0) {
      toast({
        title: "Validation Error",
        description: "Please enter valid stock quantities",
        variant: "destructive",
      });
      return;
    }
    
    if (selectedProduct) {
      const productData = {
        name: formData.name,
        brand: formData.brand,
        category: formData.category,
        mrp,
        sellingPrice,
        discount,
        stockQty,
        minStockLevel,
        warehouseLocation: formData.warehouseLocation,
        barcode: formData.barcode,
        warranty: formData.warranty,
        images: formData.images.filter(img => img.trim() !== ""),
        modelCompatibility: formData.modelCompatibility.filter(m => m.trim() !== ""),
        variants: formData.variants.filter(v => v.size || v.color),
      };
      
      updateProductMutation.mutate({
        id: selectedProduct._id,
        data: productData,
      });
    }
  };

  const handleManageStock = (product: any) => {
    setSelectedProduct(product);
    setStockFormData({ quantity: "", type: "IN", reason: "" });
    setIsStockDialogOpen(true);
  };

  const handleUpdateStock = (e: React.FormEvent) => {
    e.preventDefault();
    
    const quantity = parseInt(stockFormData.quantity);
    
    if (isNaN(quantity) || quantity <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid quantity greater than 0",
        variant: "destructive",
      });
      return;
    }
    
    if (!stockFormData.reason) {
      toast({
        title: "Validation Error",
        description: "Please provide a reason for the stock change",
        variant: "destructive",
      });
      return;
    }
    
    if (selectedProduct) {
      updateStockMutation.mutate({
        productId: selectedProduct._id,
        type: stockFormData.type,
        quantity,
        reason: stockFormData.reason,
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateDiscountPercentage = (mrp: number, sellingPrice: number) => {
    if (mrp > sellingPrice) {
      return Math.round(((mrp - sellingPrice) / mrp) * 100);
    }
    return 0;
  };

  const filteredProducts = products.filter((product: any) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.barcode && product.barcode.includes(searchTerm));
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ["all", ...Array.from(new Set(products.map((p: any) => p.category)))];

  const getStatusBadge = (status: string, stock: number) => {
    switch (status) {
      case "in_stock":
        return <Badge variant="default" data-testid={`status-in-stock`}>In Stock ({stock})</Badge>;
      case "low_stock":
        return <Badge variant="secondary" data-testid={`status-low-stock`}>Low Stock ({stock})</Badge>;
      case "out_of_stock":
        return <Badge variant="destructive" data-testid={`status-out-of-stock`}>Out of Stock</Badge>;
      default:
        return <Badge variant="outline" data-testid={`status-${status}`}>{status}</Badge>;
    }
  };

  const renderProductForm = (isEdit: boolean) => (
    <form onSubmit={isEdit ? handleUpdateProduct : handleCreateProduct} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Product Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            data-testid="input-product-name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brand">Brand *</Label>
          <Input
            id="brand"
            value={formData.brand}
            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            required
            data-testid="input-product-brand"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Input
            id="category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            required
            placeholder="e.g., Engine Parts, Brakes"
            data-testid="input-product-category"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="barcode">Barcode/QR Code</Label>
          <div className="relative">
            <Barcode className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="barcode"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              className="pl-10"
              data-testid="input-product-barcode"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="mrp">MRP *</Label>
          <Input
            id="mrp"
            type="number"
            step="0.01"
            value={formData.mrp}
            onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
            required
            data-testid="input-product-mrp"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sellingPrice">Selling Price *</Label>
          <Input
            id="sellingPrice"
            type="number"
            step="0.01"
            value={formData.sellingPrice}
            onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
            required
            data-testid="input-product-sellingprice"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="discount">Discount % (Auto-calculated)</Label>
          <Input
            id="discount"
            type="text"
            value={formData.mrp && formData.sellingPrice ? 
              `${calculateDiscountPercentage(parseFloat(formData.mrp), parseFloat(formData.sellingPrice))}%` : 
              '0%'
            }
            readOnly
            className="bg-muted"
            data-testid="input-product-discount"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="stockQty">Stock Quantity *</Label>
          <Input
            id="stockQty"
            type="number"
            value={formData.stockQty}
            onChange={(e) => setFormData({ ...formData, stockQty: e.target.value })}
            required
            data-testid="input-product-stockqty"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="minStockLevel">Min Stock Level *</Label>
          <Input
            id="minStockLevel"
            type="number"
            value={formData.minStockLevel}
            onChange={(e) => setFormData({ ...formData, minStockLevel: e.target.value })}
            required
            data-testid="input-product-minstocklevel"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="warehouseLocation">Warehouse Location</Label>
          <Input
            id="warehouseLocation"
            value={formData.warehouseLocation}
            onChange={(e) => setFormData({ ...formData, warehouseLocation: e.target.value })}
            data-testid="input-product-warehouse"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="warranty">Warranty Information</Label>
        <Input
          id="warranty"
          value={formData.warranty}
          onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
          placeholder="e.g., 1 Year Manufacturer Warranty"
          data-testid="input-product-warranty"
        />
      </div>

      <div className="space-y-2">
        <Label>Product Images</Label>
        {formData.images.map((image, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={image}
              onChange={(e) => updateImage(index, e.target.value)}
              placeholder="Image URL"
              data-testid={`input-image-${index}`}
            />
            {formData.images.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => removeImage(index)}
                data-testid={`button-remove-image-${index}`}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addImage}
          data-testid="button-add-image"
        >
          <ImagePlus className="h-4 w-4 mr-2" />
          Add Image
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Model Compatibility</Label>
        <p className="text-xs text-muted-foreground">
          Select vehicle brands and models this product is compatible with
        </p>
        {formData.modelCompatibility.map((model, index) => (
          <div key={index} className="space-y-2">
            <div className="flex gap-2">
              <Select
                value={model.startsWith('Other:') || !VEHICLE_DATA.some(brand => 
                  brand.models.some(m => model === `${brand.name} - ${m.name}`)
                ) ? 'Other' : model.split(' - ')[0] || ''}
                onValueChange={(brand) => {
                  if (brand === 'Other') {
                    updateModelCompat(index, 'Other: ');
                  } else {
                    updateModelCompat(index, brand);
                  }
                }}
              >
                <SelectTrigger className="w-[200px]" data-testid={`select-brand-${index}`}>
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_DATA.map((brand) => (
                    <SelectItem key={brand.name} value={brand.name}>
                      {brand.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              
              {model && !model.startsWith('Other:') && VEHICLE_DATA.find(b => b.name === model.split(' - ')[0]) && (
                <Select
                  value={model.split(' - ')[1] || ''}
                  onValueChange={(modelName) => {
                    const brand = model.split(' - ')[0];
                    updateModelCompat(index, `${brand} - ${modelName}`);
                  }}
                >
                  <SelectTrigger className="flex-1" data-testid={`select-model-${index}`}>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_DATA.find(b => b.name === model.split(' - ')[0])?.models.map((m) => (
                      <SelectItem key={m.name} value={m.name}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {model.startsWith('Other:') && (
                <Input
                  value={model.replace('Other: ', '')}
                  onChange={(e) => updateModelCompat(index, `Other: ${e.target.value}`)}
                  placeholder="Enter custom compatibility"
                  className="flex-1"
                  data-testid={`input-custom-model-${index}`}
                />
              )}
              
              {formData.modelCompatibility.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeModelCompat(index)}
                  data-testid={`button-remove-model-${index}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {model && !model.startsWith('Other:') && model.includes(' - ') && (
              <p className="text-xs text-green-600">
                ✓ Selected: {model}
              </p>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addModelCompat}
          data-testid="button-add-model"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Another Vehicle
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Product Variants</Label>
        {formData.variants.map((variant, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={variant.size}
              onChange={(e) => updateVariant(index, 'size', e.target.value)}
              placeholder="Size"
              data-testid={`input-variant-size-${index}`}
            />
            <Input
              value={variant.color}
              onChange={(e) => updateVariant(index, 'color', e.target.value)}
              placeholder="Color"
              data-testid={`input-variant-color-${index}`}
            />
            {formData.variants.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => removeVariant(index)}
                data-testid={`button-remove-variant-${index}`}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addVariant}
          data-testid="button-add-variant"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Variant
        </Button>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            isEdit ? setIsEditDialogOpen(false) : setIsCreateDialogOpen(false);
            if (!isEdit) resetForm();
          }}
          data-testid="button-cancel-product"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={isEdit ? updateProductMutation.isPending : createProductMutation.isPending}
          data-testid="button-submit-product"
        >
          {isEdit 
            ? (updateProductMutation.isPending ? 'Updating...' : 'Update Product')
            : (createProductMutation.isPending ? 'Creating...' : 'Create Product')
          }
        </Button>
      </div>
    </form>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Products & Inventory</h1>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">Failed to load products</h3>
              <p className="text-muted-foreground mb-4">
                {(error as Error)?.message || 'An error occurred while fetching products'}
              </p>
              <Button onClick={() => refetch()}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Products & Inventory</h1>
        <div className="flex gap-2 flex-wrap">
          <input
            type="file"
            id="import-products"
            accept=".xlsx,.xls"
            onChange={handleImportProducts}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={handleExportProducts}
            disabled={products.length === 0}
            data-testid="button-export"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            onClick={() => document.getElementById('import-products')?.click()}
            data-testid="button-import"
            size="sm"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button
            variant="outline"
            onClick={() => deleteDuplicatesMutation.mutate()}
            disabled={deleteDuplicatesMutation.isPending}
            data-testid="button-delete-duplicates"
            size="sm"
          >
            <Copy className="h-4 w-4 mr-2" />
            Delete Duplicates
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-product" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
                <DialogDescription>
                  Add a new product with specifications, images, and variants
                </DialogDescription>
              </DialogHeader>
              {renderProductForm(false)}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products by name, brand, or barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat: string) => (
              <SelectItem key={cat} value={cat}>
                {cat === "all" ? "All Categories" : cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredProducts.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product: any) => {
            const discountPercent = calculateDiscountPercentage(product.mrp, product.sellingPrice);
            return (
              <Card key={product._id} className="hover-elevate" data-testid={`card-product-${product._id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{product.brand}</p>
                      {product.barcode && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Barcode className="h-3 w-3" />
                          {product.barcode}
                        </p>
                      )}
                    </div>
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {product.images && product.images.length > 0 && product.images[0] ? (
                    <div className="relative w-full h-40 bg-muted rounded-md overflow-hidden">
                      <img 
                        src={product.images[0]} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden absolute inset-0 flex items-center justify-center bg-muted">
                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-40 bg-muted rounded-md flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" data-testid={`category-${product._id}`}>{product.category}</Badge>
                    {getStatusBadge(product.status, product.stockQty)}
                    {discountPercent > 0 && (
                      <Badge variant="default" className="bg-green-600">
                        {discountPercent}% OFF
                      </Badge>
                    )}
                  </div>

                  {product.warranty && (
                    <p className="text-xs text-muted-foreground">
                      Warranty: {product.warranty}
                    </p>
                  )}

                  {product.modelCompatibility && product.modelCompatibility.length > 0 && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Compatible: </span>
                      <span>{product.modelCompatibility.slice(0, 2).join(', ')}</span>
                      {product.modelCompatibility.length > 2 && <span> +{product.modelCompatibility.length - 2} more</span>}
                    </div>
                  )}

                  {product.variants && product.variants.length > 0 && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Variants: </span>
                      {product.variants.map((v: any, i: number) => (
                        <Badge key={i} variant="outline" className="mr-1">
                          {v.size && v.color ? `${v.size}/${v.color}` : v.size || v.color}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-muted-foreground">MRP</p>
                      <p className="text-sm line-through text-muted-foreground">{formatCurrency(product.mrp)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Selling Price</p>
                      <p className="text-lg font-bold">{formatCurrency(product.sellingPrice)}</p>
                    </div>
                  </div>

                  {product.warehouseLocation && (
                    <p className="text-xs text-muted-foreground">
                      Location: {product.warehouseLocation}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1" 
                      onClick={() => handleEditProduct(product)}
                      data-testid={`button-edit-${product._id}`}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1" 
                      onClick={() => handleManageStock(product)}
                      data-testid={`button-stock-${product._id}`}
                    >
                      Manage Stock
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setSelectedProduct(product);
                        setIsDeleteDialogOpen(true);
                      }}
                      data-testid={`button-delete-${product._id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : products.length > 0 ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No products match your search criteria</p>
        </div>
      ) : (
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No products found. Add your first product to get started.</p>
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update product information, specifications, and variants
            </DialogDescription>
          </DialogHeader>
          {renderProductForm(true)}
        </DialogContent>
      </Dialog>

      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Stock</DialogTitle>
            <DialogDescription>
              Update inventory for {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateStock} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stock-type">Transaction Type</Label>
              <Select
                value={stockFormData.type}
                onValueChange={(value) => setStockFormData({ ...stockFormData, type: value })}
              >
                <SelectTrigger data-testid="select-stock-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">Stock In</SelectItem>
                  <SelectItem value="OUT">Stock Out</SelectItem>
                  <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                  <SelectItem value="RETURN">Return</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock-quantity">Quantity</Label>
              <Input
                id="stock-quantity"
                type="number"
                value={stockFormData.quantity}
                onChange={(e) => setStockFormData({ ...stockFormData, quantity: e.target.value })}
                required
                data-testid="input-stock-quantity"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock-reason">Reason</Label>
              <Textarea
                id="stock-reason"
                value={stockFormData.reason}
                onChange={(e) => setStockFormData({ ...stockFormData, reason: e.target.value })}
                required
                data-testid="input-stock-reason"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsStockDialogOpen(false)}
                data-testid="button-cancel-stock"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateStockMutation.isPending}
                data-testid="button-submit-stock"
              >
                {updateStockMutation.isPending ? 'Updating...' : 'Update Stock'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedProduct?.name}"? This action cannot be undone and will permanently remove this product from your inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedProduct) {
                  deleteProductMutation.mutate(selectedProduct._id);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
