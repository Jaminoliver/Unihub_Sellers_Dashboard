'use client';

import { useActionState } from 'react';
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
import { X, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  category_id: string;
  university_id?: string;
  condition?: string;
  sku?: string;
  original_price?: number;
  discount_percentage?: number;
  brand?: string;
  colors?: string[];
  sizes?: string[];
  image_urls?: string[];
}

interface Category {
  id: string;
  name: string;
}

interface University {
  id: string;
  name: string;
  short_name?: string;
}

interface EditProductFormProps {
  product: Product;
  categories: Category[];
  sellerState: string;
  isResubmit?: boolean;
  rejectionReason?: string | null;
}

export function EditProductForm({ 
  product, 
  categories, 
  sellerState,
  isResubmit = false,
  rejectionReason = null
}: EditProductFormProps) {
  const [state, formAction] = useActionState(
    updateProduct.bind(null, product.id),
    { error: null }
  );
  const [existingImages, setExistingImages] = useState<string[]>(
    product.image_urls || []
  );
  const [newImages, setNewImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [loadingUniversities, setLoadingUniversities] = useState(true);
  const [selectedUniversity, setSelectedUniversity] = useState<string>(
    product.university_id || ''
  );
  const [selectedSizes, setSelectedSizes] = useState<string[]>(product.sizes || []);
  const [sizeType, setSizeType] = useState<'clothing' | 'shoes' | 'none'>('none');
  const [price, setPrice] = useState(product.price);
  const [originalPrice, setOriginalPrice] = useState(product.original_price || 0);
  const [selectedColors, setSelectedColors] = useState<string[]>(product.colors || []);
  const [customColor, setCustomColor] = useState('');
  
  const discountPercentage = originalPrice && originalPrice > 0 && price > 0
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  // Fetch universities from seller's state
  useEffect(() => {
    const fetchUniversities = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('universities')
          .select('id, name, short_name')
          .eq('state', sellerState)
          .eq('is_active', true)
          .order('name');

        if (error) {
          console.error('Error fetching universities:', error);
          toast.error('Failed to load universities');
        } else {
          setUniversities(data || []);
        }
      } catch (error) {
        console.error('Error:', error);
        toast.error('An error occurred while loading universities');
      } finally {
        setLoadingUniversities(false);
      }
    };

    if (sellerState) {
      fetchUniversities();
    }
  }, [sellerState]);

  // Detect size type from existing sizes
  useEffect(() => {
    if (product.sizes && product.sizes.length > 0) {
      const firstSize = product.sizes[0];
      if (['XS', 'S', 'M', 'L', 'XL', 'XXL'].includes(firstSize)) {
        setSizeType('clothing');
      } else if (!isNaN(Number(firstSize))) {
        setSizeType('shoes');
      }
    }
  }, [product.sizes]);

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

  const handleSubmit = (formData: FormData) => {
    if (!selectedUniversity) {
      toast.error('Please select a university');
      return;
    }
    
    // Add resubmit flag if this is a resubmission
    if (isResubmit) {
      formData.append('resubmit', 'true');
    }
    
    formAction(formData);
  };

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Resubmit Banner */}
      {isResubmit && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900">Resubmitting for Approval</h3>
              <p className="text-sm text-blue-800 mt-1">
                After updating this product, it will be sent back to the admin for review. 
                Make sure to address all issues mentioned in the rejection reason.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Keep track of whether we're keeping old images */}
      <input
        type="hidden"
        name="keepOldImages"
        value={existingImages.length > 0 ? 'true' : 'false'}
      />

      {/* Hidden university field for form submission */}
      <input
        type="hidden"
        name="university_id"
        value={selectedUniversity}
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

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="price">Current Price (₦) *</Label>
          <Input
            type="number"
            id="price"
            name="price"
            value={price}
            onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
            required
            min="1"
            step="0.01"
            placeholder="0.00"
          />
        </div>

        <div>
          <Label htmlFor="original_price">Original Price (Optional)</Label>
          <Input
            type="number"
            id="original_price"
            name="original_price"
            value={originalPrice}
            onChange={(e) => setOriginalPrice(parseFloat(e.target.value) || 0)}
            min="0"
            step="0.01"
            placeholder="0.00"
          />
        </div>

        <div>
          <Label>Discount</Label>
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-lg font-bold text-green-600">
              {discountPercentage > 0 ? `${discountPercentage}% OFF` : 'No discount'}
            </p>
          </div>
          <input type="hidden" name="discount_percentage" value={discountPercentage} />
        </div>
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

      <div>
        <Label htmlFor="category">Category *</Label>
        <Select name="category" defaultValue={product.category_id} required>
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent
            position="popper"
            side="bottom"
            align="start"
            className="max-h-[300px] overflow-y-auto"
          >
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* University Dropdown - REQUIRED */}
      <div>
        <Label htmlFor="university">University *</Label>
        <Select
          value={selectedUniversity}
          onValueChange={setSelectedUniversity}
          disabled={loadingUniversities}
          required
        >
          <SelectTrigger className={!selectedUniversity ? 'border-red-500' : ''}>
            <SelectValue 
              placeholder={
                loadingUniversities 
                  ? 'Loading universities...' 
                  : 'Select university'
              } 
            />
          </SelectTrigger>
          <SelectContent
            position="popper"
            side="bottom"
            align="start"
            className="max-h-[300px] overflow-y-auto"
          >
            {universities.map((uni) => (
              <SelectItem key={uni.id} value={uni.id}>
                {uni.name} {uni.short_name ? `(${uni.short_name})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500 mt-1">
          Universities in {sellerState} state
        </p>
        {!selectedUniversity && (
          <p className="text-xs text-red-500 mt-1">
            University selection is required
          </p>
        )}
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

      <div>
        <Label htmlFor="brand">Brand (Optional)</Label>
        <Input
          type="text"
          id="brand"
          name="brand"
          defaultValue={product.brand || ''}
          placeholder="Product brand"
        />
      </div>

      {/* Colors */}
      <div>
        <Label>Colors (Optional)</Label>
        <div className="space-y-3 mt-2">
          <div className="flex flex-wrap gap-2">
            {['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Grey', 'Brown'].map((color) => (
              <Button
                key={color}
                type="button"
                variant={selectedColors.includes(color) ? 'default' : 'outline'}
                onClick={() => {
                  setSelectedColors(prev =>
                    prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
                  );
                }}
                className="h-8 text-xs"
              >
                {color}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Custom color"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && customColor.trim()) {
                  e.preventDefault();
                  setSelectedColors(prev => [...prev, customColor.trim()]);
                  setCustomColor('');
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (customColor.trim()) {
                  setSelectedColors(prev => [...prev, customColor.trim()]);
                  setCustomColor('');
                }
              }}
            >
              Add
            </Button>
          </div>
          {selectedColors.length > 0 && (
            <p className="text-sm text-gray-600">
              Selected: {selectedColors.join(', ')}
            </p>
          )}
          <input type="hidden" name="colors" value={JSON.stringify(selectedColors)} />
        </div>
      </div>

      {/* Product Sizes */}
      <div>
        <Label>Product Sizes (Optional)</Label>
        <div className="space-y-4 mt-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={sizeType === 'none' ? 'default' : 'outline'}
              onClick={() => {
                setSizeType('none');
                setSelectedSizes([]);
              }}
              className="flex-1"
            >
              No Size
            </Button>
            <Button
              type="button"
              variant={sizeType === 'clothing' ? 'default' : 'outline'}
              onClick={() => {
                setSizeType('clothing');
                setSelectedSizes([]);
              }}
              className="flex-1"
            >
              Clothing
            </Button>
            <Button
              type="button"
              variant={sizeType === 'shoes' ? 'default' : 'outline'}
              onClick={() => {
                setSizeType('shoes');
                setSelectedSizes([]);
              }}
              className="flex-1"
            >
              Shoes
            </Button>
          </div>

          {sizeType === 'clothing' && (
            <div className="flex flex-wrap gap-2">
              {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((size) => (
                <Button
                  key={size}
                  type="button"
                  variant={selectedSizes.includes(size) ? 'default' : 'outline'}
                  onClick={() => {
                    setSelectedSizes(prev =>
                      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
                    );
                  }}
                  className="w-16"
                >
                  {size}
                </Button>
              ))}
            </div>
          )}

          {sizeType === 'shoes' && (
            <div className="flex flex-wrap gap-2">
              {['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'].map((size) => (
                <Button
                  key={size}
                  type="button"
                  variant={selectedSizes.includes(size) ? 'default' : 'outline'}
                  onClick={() => {
                    setSelectedSizes(prev =>
                      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
                    );
                  }}
                  className="w-12"
                >
                  {size}
                </Button>
              ))}
            </div>
          )}

          {selectedSizes.length > 0 && (
            <p className="text-sm text-gray-600">
              Selected: {selectedSizes.join(', ')}
            </p>
          )}
          <input type="hidden" name="sizes" value={JSON.stringify(selectedSizes)} />
        </div>
      </div>

      <div className="flex gap-4">
        <Button 
          type="submit" 
          className="flex-1"
          disabled={!selectedUniversity || loadingUniversities}
        >
          {isResubmit ? 'Fix & Resubmit for Approval' : 'Update Product'}
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