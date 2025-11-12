import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ProductTable } from '@/components/features/products/ProductTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Package, AlertTriangle, TrendingUp, ShoppingBag, Clock } from 'lucide-react';
import Link from 'next/link';
import type { Product } from '@/lib/types';

async function getProducts(supabase: any, sellerId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      price,
      stock_quantity,
      is_available,
      created_at,
      category_id,
      image_urls,
      suspended_until,
      suspension_reason
    `)
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }

  return data.map((item: any) => ({
    ...item,
    image_urls: item.image_urls ? (Array.isArray(item.image_urls) ? item.image_urls : []) : [],
    // Add computed is_suspended field on the frontend
    is_suspended: item.suspended_until ? new Date(item.suspended_until) > new Date() : false,
  }));
}

// Helper function to check if product is suspended
function isSuspended(suspendedUntil: string | null): boolean {
  if (!suspendedUntil) return false;
  return new Date(suspendedUntil) > new Date();
}

// Helper function to get product statistics
function getProductStats(products: Product[]) {
  const totalProducts = products.length;
  const activeProducts = products.filter((p) => 
    p.is_available && !isSuspended(p.suspended_until) && p.stock_quantity > 0
  ).length;
  const lowStockProducts = products.filter((p) => 
    p.stock_quantity < 10 && p.stock_quantity > 0 && !isSuspended(p.suspended_until)
  ).length;
  const outOfStockProducts = products.filter((p) => 
    p.stock_quantity === 0
  ).length;
  const suspendedProducts = products.filter((p) => 
    isSuspended(p.suspended_until)
  ).length;
  const totalValue = products.reduce((sum, p) => sum + p.price, 0);

  return {
    totalProducts,
    activeProducts,
    lowStockProducts,
    outOfStockProducts,
    suspendedProducts,
    totalValue,
  };
}

export default async function ProductsPage() {
  const supabase = await createServerSupabaseClient();

  // 1. Get the authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to view your products.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // 2. Get the seller ID from the 'sellers' table
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (sellerError || !seller) {
    console.error('Error finding seller profile:', sellerError);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Seller Profile Not Found</CardTitle>
            <CardDescription>
              Could not find your seller profile. Please contact support.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // 3. Get the products for this seller
  const products = await getProducts(supabase, seller.id);

  // 4. Calculate stats using the helper function
  const stats = getProductStats(products);

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Products Catalog
          </h1>
          <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 mt-1">
            Manage and track your product inventory
          </p>
        </div>
        <Button asChild className="w-full md:w-auto">
          <Link href="/dashboard/products/new">
            <PlusCircle className="mr-2 h-5 w-5" />
            Add New Product
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Products Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.activeProducts} active
            </p>
          </CardContent>
        </Card>

        {/* Inventory Value Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{stats.totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total products value
            </p>
          </CardContent>
        </Card>

        {/* Suspended Products Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.suspendedProducts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Temporarily hidden
            </p>
          </CardContent>
        </Card>

        {/* Low Stock Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.lowStockProducts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Below 10 units
            </p>
          </CardContent>
        </Card>

        {/* Out of Stock Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <ShoppingBag className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.outOfStockProducts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Needs restocking
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Suspended Products Alert */}
      {stats.suspendedProducts > 0 && (
        <Card className="border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-orange-600 dark:text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900 dark:text-orange-100">
                  Suspended Products
                </h3>
                <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">
                  {stats.suspendedProducts} product{stats.suspendedProducts !== 1 ? 's are' : ' is'} currently suspended and hidden from buyers. 
                  They will automatically become available when the suspension period ends.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Low Stock Alert */}
      {stats.lowStockProducts > 0 && (
        <Card className="border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                  Low Stock Warning
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                  {stats.lowStockProducts} product{stats.lowStockProducts !== 1 ? 's are' : ' is'} running low on stock. 
                  Consider restocking soon to avoid lost sales.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Out of Stock Alert */}
      {stats.outOfStockProducts > 0 && (
        <Card className="border-l-4 border-red-500 bg-red-50 dark:bg-red-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <ShoppingBag className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 dark:text-red-100">
                  Out of Stock Alert
                </h3>
                <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                  {stats.outOfStockProducts} product{stats.outOfStockProducts !== 1 ? 's are' : ' is'} completely out of stock. 
                  These products are not visible to buyers.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {stats.totalProducts === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No products yet
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6 max-w-sm">
              Get started by adding your first product to start selling on UniHub.
            </p>
            <Button asChild>
              <Link href="/dashboard/products/new">
                <PlusCircle className="mr-2 h-5 w-5" />
                Add Your First Product
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Product Table */}
      {stats.totalProducts > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Products</CardTitle>
            <CardDescription>
              View and manage all your listed products
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProductTable data={products} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}