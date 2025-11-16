'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addProduct } from '@/app/dashboard/products/new/actions';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const productSchema = z.object({
  name: z.string().min(5, 'Product name must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  price: z.number().min(1, 'Price must be greater than 0'),
  stock: z.number().min(0, 'Stock cannot be negative'),
  category: z.string().min(1, 'You must select a category'),
  university_id: z.string().min(1, 'You must select a university'),
  condition: z.enum(['new', 'used'], {
    message: 'Please select product condition',
  }),
  sku: z.string().optional(),
  original_price: z.number().optional(),
  brand: z.string().optional(),
  colors: z.array(z.string()).optional(),
  sizes: z.array(z.string()).optional(),
  images: z
    .any()
    .refine((files: FileList) => files?.length >= 1, 'You must upload at least 1 image.')
    .refine((files: FileList) => files?.length <= 5, 'You can upload a maximum of 5 images.'),
}).refine(
  (data) => {
    if (data.original_price && data.original_price > 0) {
      return data.original_price >= data.price;
    }
    return true;
  },
  {
    message: 'Original price must be greater than or equal to current price',
    path: ['original_price'],
  }
);

type ProductFormValues = z.infer<typeof productSchema>;

interface AddProductFormProps {
  categories: { id: string; name: string }[];
  universities: { id: string; name: string }[];
  sellerState: string;
}

export function AddProductForm({ categories, universities, sellerState }: AddProductFormProps) {
  const [isSubmitting, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [sizeType, setSizeType] = useState<'clothing' | 'shoes' | 'none'>('none');
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [customColor, setCustomColor] = useState('');

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      stock: 1,
      category: '',
      university_id: '',
      condition: 'new',
      sku: '',
      original_price: 0,
      brand: '',
      colors: [],
      sizes: [],
      images: undefined,
    },
  });

  // Calculate discount percentage
  const watchPrice = form.watch('price');
  const watchOriginalPrice = form.watch('original_price');
  const discountPercentage =
    watchOriginalPrice && watchOriginalPrice > 0 && watchPrice > 0
      ? Math.round(((watchOriginalPrice - watchPrice) / watchOriginalPrice) * 100)
      : 0;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        newUrls.push(URL.createObjectURL(files[i]));
      }
      setImagePreviewUrls(newUrls.slice(0, 5));
      form.setValue('images', files as any, { shouldValidate: true });
    }
  };

  const onSubmit = async (data: ProductFormValues) => {
    setServerError(null);
    
    console.log('Form data before submit:', data);
    console.log('University ID:', data.university_id);

    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('description', data.description);
    formData.append('price', data.price.toString());
    formData.append('stock', data.stock.toString());
    formData.append('category', data.category);
    formData.append('university_id', data.university_id);
    formData.append('condition', data.condition);

    if (data.original_price && data.original_price > 0) {
      formData.append('original_price', data.original_price.toString());
      formData.append('discount_percentage', discountPercentage.toString());
    }

    if (data.sku) formData.append('sku', data.sku);
    if (data.brand) formData.append('brand', data.brand);
    if (data.colors && data.colors.length > 0) {
      formData.append('colors', JSON.stringify(data.colors));
    }
    if (data.sizes && data.sizes.length > 0) {
      formData.append('sizes', JSON.stringify(data.sizes));
    }

    if (data.images) {
      for (let i = 0; i < data.images.length; i++) {
        formData.append('images', data.images[i]);
      }
    }

    startTransition(async () => {
      const result = await addProduct({ error: null }, formData);
      if (result?.error) {
        setServerError(result.error);
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {serverError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <div className="bg-white border rounded-lg shadow-sm">
          <div className="p-6 space-y-6">
            {/* Product Images */}
            <FormField
              control={form.control}
              name="images"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Images (Up to 5)</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      multiple
                      accept="image/*"
                      name="images"
                      onChange={handleImageChange}
                      value={undefined}
                    />
                  </FormControl>
                  <FormMessage />
                  {imagePreviewUrls.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {imagePreviewUrls.map((url, index) => (
                        <img
                          key={index}
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="h-20 w-20 rounded-md object-cover"
                        />
                      ))}
                    </div>
                  )}
                </FormItem>
              )}
            />

            {/* Product Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Engineering Mathematics Vol. 1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detailed product description..."
                      className="min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Condition */}
              <FormField
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condition</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="new">Brand New</SelectItem>
                        <SelectItem value="used">Used</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* University */}
              <FormField
                control={form.control}
                name="university_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>University <span className="text-red-500">*</span></FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                      disabled={universities.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger className={!field.value ? 'border-red-300' : ''}>
                          <SelectValue placeholder={
                            universities.length === 0 ? 'No universities found' : 'Select university'
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {universities.map((uni) => (
                          <SelectItem key={uni.id} value={uni.id}>
                            {uni.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {sellerState ? `Universities in ${sellerState}` : 'Update your state in Settings first'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Pricing Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Pricing</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Current Price */}
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Price (NGN)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="15000"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>The selling price</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Original Price */}
                <FormField
                  control={form.control}
                  name="original_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Original Price (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="20000"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>Price before discount</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Discount Display */}
                <div className="flex flex-col justify-end">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-gray-600 mb-1">Discount</p>
                    <p className="text-2xl font-bold text-green-600">
                      {discountPercentage > 0 ? `${discountPercentage}% OFF` : 'No discount'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Additional Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Stock */}
                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="10"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>How many units available</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* SKU */}
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., BOOK-001, LAP-HP-123" {...field} />
                      </FormControl>
                      <FormDescription>Product identification code</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Brand */}
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., HP, Apple, Generic" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Colors */}
              <div className="mt-6">
                <FormField
                  control={form.control}
                  name="colors"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Colors (Optional)</FormLabel>
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Grey', 'Brown'].map((color) => (
                            <Button
                              key={color}
                              type="button"
                              variant={selectedColors.includes(color) ? 'default' : 'outline'}
                              onClick={() => {
                                const newColors = selectedColors.includes(color)
                                  ? selectedColors.filter(c => c !== color)
                                  : [...selectedColors, color];
                                setSelectedColors(newColors);
                                field.onChange(newColors);
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
                                const newColors = [...selectedColors, customColor.trim()];
                                setSelectedColors(newColors);
                                field.onChange(newColors);
                                setCustomColor('');
                              }
                            }}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              if (customColor.trim()) {
                                const newColors = [...selectedColors, customColor.trim()];
                                setSelectedColors(newColors);
                                field.onChange(newColors);
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
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Product Sizes */}
              <div className="mt-6">
                <FormField
                  control={form.control}
                  name="sizes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Sizes (Optional)</FormLabel>
                      <div className="space-y-4">
                        {/* Size Type Selector */}
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={sizeType === 'none' ? 'default' : 'outline'}
                            onClick={() => {
                              setSizeType('none');
                              setSelectedSizes([]);
                              field.onChange([]);
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
                              field.onChange([]);
                            }}
                            className="flex-1"
                          >
                            Clothing (XS-XXL)
                          </Button>
                          <Button
                            type="button"
                            variant={sizeType === 'shoes' ? 'default' : 'outline'}
                            onClick={() => {
                              setSizeType('shoes');
                              setSelectedSizes([]);
                              field.onChange([]);
                            }}
                            className="flex-1"
                          >
                            Shoes (36-46)
                          </Button>
                        </div>

                        {/* Clothing Sizes */}
                        {sizeType === 'clothing' && (
                          <div className="flex flex-wrap gap-2">
                            {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((size) => (
                              <Button
                                key={size}
                                type="button"
                                variant={selectedSizes.includes(size) ? 'default' : 'outline'}
                                onClick={() => {
                                  const newSizes = selectedSizes.includes(size)
                                    ? selectedSizes.filter(s => s !== size)
                                    : [...selectedSizes, size];
                                  setSelectedSizes(newSizes);
                                  field.onChange(newSizes);
                                }}
                                className="w-16"
                              >
                                {size}
                              </Button>
                            ))}
                          </div>
                        )}

                        {/* Shoe Sizes */}
                        {sizeType === 'shoes' && (
                          <div className="flex flex-wrap gap-2">
                            {['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'].map((size) => (
                              <Button
                                key={size}
                                type="button"
                                variant={selectedSizes.includes(size) ? 'default' : 'outline'}
                                onClick={() => {
                                  const newSizes = selectedSizes.includes(size)
                                    ? selectedSizes.filter(s => s !== size)
                                    : [...selectedSizes, size];
                                  setSelectedSizes(newSizes);
                                  field.onChange(newSizes);
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
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end p-4 bg-gray-50 border-t rounded-b-lg">
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Adding Product...' : 'Add Product'}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}