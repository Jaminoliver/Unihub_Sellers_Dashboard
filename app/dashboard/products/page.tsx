import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ProductTable } from '@/components/features/products/ProductTable';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import type { Product } from '@/lib/types';

async function getProducts(supabase: any, sellerId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(
      `
      id,
      name,
      price,
      stock_quantity,
      is_available,
      created_at,
      category_id,
      image_urls
    `
    )
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }

  return data.map((item: any) => ({
    ...item,
    image_urls: item.image_urls ? (item.image_urls as string[]) : [],
  }));
}

export default async function ProductsPage() {
  // FIXED: Await the client creation
  const supabase = await createServerSupabaseClient();

  // 1. Get the authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div>Not authenticated.</div>;
  }

  // 2. Get the seller ID from the 'sellers' table
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (sellerError || !seller) {
    console.error('Error finding seller profile:', sellerError);
    return <div>Error: Could not find your seller profile.</div>;
  }

  // 3. Get the products for this seller
  const products = await getProducts(supabase, seller.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products Catalog</h1>
          <p className="text-gray-500 mt-1">
            Manage all products in your inventory.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/products/new">
            <PlusCircle className="mr-2 h-5 w-5" />
            Add New Product
          </Link>
        </Button>
      </div>

      {/* Low stock warning */}
      <div className="rounded-lg border-l-4 border-yellow-400 bg-yellow-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.742-2.98l5.58-9.92zM10 13a1 1 0 100-2 1 1 0 000 2zm-0.01-3a1 1 0 00-1 1v1a1 1 0 102 0v-1a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <span className="font-medium">1 product(s) are running low on stock.</span>
              {' '}Restock soon to avoid lost sales.
            </p>
          </div>
        </div>
      </div>

      {/* Product Table */}
      <ProductTable data={products} />
    </div>
  );
}