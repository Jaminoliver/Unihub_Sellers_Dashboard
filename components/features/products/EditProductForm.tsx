'use client';

import { useActionState } from 'react'; // CHANGED from useFormState
import { useEffect, useState } from 'react';
import { updateProduct } from '@/app/dashboard/products/new/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  category_id: string;
  condition?: string;
  sku?: string;
  original_price?: number;
  discount_percentage?: number;
  brand?: string;
  color?: string;
  image_urls?: string[];
}

interface Category {
  id: string;
  name: string;
}

interface EditProductFormProps {
  product: Product;
  categories: Category[];
}

export function EditProductForm({ product, categories }: EditProductFormProps) {
  const [state, formAction] = useActionState( // CHANGED from useFormState
    updateProduct.bind(null, product.id),
    { error: null }
  );
  const [existingImages, setExistingImages] = useState<string[]>(
    product.image_urls || []
  );
  const [newImages, setNewImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }
  }, [state.error]);

  const handleRemoveExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalImages = existingImages.length + newImages.length + files.length;

    if (totalImages > 8) {
      toast.error('Maximum 8 images allowed');
      return;
    }

    setNewImages((prev) => [...prev, ...files]);

    // Create preview URLs
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrls((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveNewImage = (index: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const totalImages = existingImages.length + newImages.length;

  return (
    <form action={formAction} className="space-y-6">
      {/* Keep track of whether we're keeping old images */}
      <input
        type="hidden"
        name="keepOldImages"
        value={existingImages.length > 0 ? 'true' : 'false'}
      />

      {/* Existing Images */}
      {existingImages.length > 0 && (
        <div>
          <Label>Current Images</Label>
          <div className="grid grid-cols-4 gap-4 mt-2">
            {existingImages.map((url, index) => (
              <div key={url} className="relative group">
                <Image
                  src={url}
                  alt={`Product ${index + 1}`}
                  width={200}
                  height={200}
                  className="w-full h-32 object-cover rounded-md border"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveExistingImage(index)}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Images Preview */}
      {previewUrls.length > 0 && (
        <div>
          <Label>New Images</Label>
          <div className="grid grid-cols-4 gap-4 mt-2">
            {previewUrls.map((url, index) => (
              <div key={url} className="relative group">
                <img
                  src={url}
                  alt={`New ${index + 1}`}
                  className="w-full h-32 object-cover rounded-md border"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveNewImage(index)}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add More Images */}
      {totalImages < 8 && (
        <div>
          <Label htmlFor="images">
            Add Images ({totalImages}/8) {totalImages < 3 && '- Minimum 3 required'}
          </Label>
          <Input
            type="file"
            id="images"
            name="images"
            accept="image/*"
            multiple
            onChange={handleNewImageChange}
            className="mt-2"
          />
        </div>
      )}

      <div>
        <Label htmlFor="name">Product Name *</Label>
        <Input
          type="text"
          id="name"
          name="name"
          defaultValue={product.name}
          required
          minLength={5}
          placeholder="Enter product name (min 5 characters)"
        />
      </div>

      <div>
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={product.description}
          required
          minLength={20}
          rows={4}
          placeholder="Enter detailed product description (min 20 characters)"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="price">Price (₦) *</Label>
          <Input
            type="number"
            id="price"
            name="price"
            defaultValue={product.price}
            required
            min="1"
            step="0.01"
            placeholder="0.00"
          />
        </div>

        <div>
          <Label htmlFor="stock">Stock Quantity *</Label>
          <Input
            type="number"
            id="stock"
            name="stock"
            defaultValue={product.stock_quantity}
            required
            min="0"
            placeholder="0"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="category">Category *</Label>
        <Select name="category" defaultValue={product.category_id} required>
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="condition">Condition</Label>
          <Select name="condition" defaultValue={product.condition || 'new'}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="used-like-new">Used - Like New</SelectItem>
              <SelectItem value="used-good">Used - Good</SelectItem>
              <SelectItem value="used-fair">Used - Fair</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="sku">SKU (Optional)</Label>
          <Input
            type="text"
            id="sku"
            name="sku"
            defaultValue={product.sku || ''}
            placeholder="Product SKU"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="original_price">Original Price (₦)</Label>
          <Input
            type="number"
            id="original_price"
            name="original_price"
            defaultValue={product.original_price || ''}
            min="0"
            step="0.01"
            placeholder="0.00"
          />
        </div>

        <div>
          <Label htmlFor="discount_percentage">Discount %</Label>
          <Input
            type="number"
            id="discount_percentage"
            name="discount_percentage"
            defaultValue={product.discount_percentage || 0}
            min="0"
            max="100"
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="brand">Brand</Label>
          <Input
            type="text"
            id="brand"
            name="brand"
            defaultValue={product.brand || ''}
            placeholder="Product brand"
          />
        </div>

        <div>
          <Label htmlFor="color">Color</Label>
          <Input
            type="text"
            id="color"
            name="color"
            defaultValue={product.color || ''}
            placeholder="Product color"
          />
        </div>
      </div>

      <div className="flex gap-4">
        <Button type="submit" className="flex-1">
          Update Product
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => window.history.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}