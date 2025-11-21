import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ProductTable } from '@/components/features/products/ProductTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Package, AlertTriangle, TrendingUp, ShoppingBag, Clock, XCircle } from 'lucide-react';
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
      suspension_reason,
      approval_status
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
    // Compute suspended status
    is_suspended: item.suspended_until ? new Date(item.suspended_until) > new Date() : false,
    // Ensure approval_status exists, default to pending if null (based on schema default)
    approval_status: item.approval_status || 'pending',
  }));
}

// Helper to check suspension
function isSuspended(suspendedUntil: string | null): boolean {
  if (!suspendedUntil) return false;
  return new Date(suspendedUntil) > new Date();
}

// Helper to get product statistics
function getProductStats(products: any[]) {
  const totalProducts = products.length;
  
  // Active = Available AND In Stock AND Approved AND Not Suspended
  const activeProducts = products.filter((p) => 
    p.is_available && 
    p.stock_quantity > 0 && 
    !isSuspended(p.suspended_until) && 
    p.approval_status === 'approved'
  ).length;

  const lowStockProducts = products.filter((p) => 
    p.stock_quantity < 10 && 
    p.stock_quantity > 0 && 
    !isSuspended(p.suspended_until) &&
    p.approval_status === 'approved'
  ).length;

  const outOfStockProducts = products.filter((p) => 
    p.stock_quantity === 0 && 
    p.approval_status === 'approved'
  ).length;

  const suspendedProducts = products.filter((p) => 
    isSuspended(p.suspended_until)
  ).length;
  
  const pendingProducts = products.filter((p) => 
    p.approval_status === 'pending'
  ).length;

  // Assuming status is 'rejected' or 'disapproved' in DB
  const disapprovedProducts = products.filter((p) => 
    p.approval_status === 'rejected' || p.approval_status === 'disapproved'
  ).length;

  const totalValue = products.reduce((sum, p) => sum + p.price, 0);

  return {
    totalProducts,
    activeProducts,
    lowStockProducts,
    outOfStockProducts,
    suspendedProducts,
    pendingProducts,
    disapprovedProducts,
    totalValue,
  };
}

export default async function ProductsPage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();

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

  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (sellerError || !seller) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Seller Profile Not Found</CardTitle>
            <CardDescription>Could not find your seller profile.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const products = await getProducts(supabase, seller.id);
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.pendingProducts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting review
            </p>
          </CardContent>
        </Card>

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

      {/* Pending Alert */}
      {stats.pendingProducts > 0 && (
        <Card className="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                  Products Pending Approval
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                  {stats.pendingProducts} product{stats.pendingProducts !== 1 ? 's are' : ' is'} currently under review. 
                  They will be visible to buyers once approved.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disapproved Alert */}
      {stats.disapprovedProducts > 0 && (
        <Card className="border-l-4 border-red-500 bg-red-50 dark:bg-red-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 dark:text-red-100">
                  Action Required
                </h3>
                <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                  {stats.disapprovedProducts} product{stats.disapprovedProducts !== 1 ? 's were' : ' was'} disapproved. 
                  Check your notifications for details.
                </p>
              </div>
            </div>
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