import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AddProductForm } from '@/components/features/products/AddProductForm';

// Helper function to get categories from Supabase
async function getCategories(supabase: any) {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .order('name', { ascending: true });
  
  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
  
  return data || [];
}

export default async function AddNewProductPage() {
  const supabase = await createServerSupabaseClient();
  const categories = await getCategories(supabase);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Add New Product</h1>
        <p className="text-gray-500 mt-1">
          Fill in the details below to list your new product.
        </p>
      </div>
      
      {/* Product Form */}
      <AddProductForm categories={categories} />
    </div>
  );
}