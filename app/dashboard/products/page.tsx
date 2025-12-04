import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ProductTable } from '@/components/features/products/ProductTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Package, Clock, XCircle, Shield, ShoppingBag, Ban, AlertCircle } from 'lucide-react';
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
      approval_status,
      admin_suspended,
      admin_suspended_at,
      admin_suspension_reason,
      is_banned,
      ban_reason,
      banned_at,
      sold_count,
      wishlist_count,
      view_count,
      delivery_count,
      review_count,
      average_rating,
      product_approvals!inner(rejection_reason)
    `)
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }

  return data.map((item: any) => {
    const isSuspendedBySeller = item.suspended_until ? new Date(item.suspended_until) > new Date() : false;
    const rejectionReason = item.product_approvals?.[0]?.rejection_reason || null;
    
    return {
      ...item,
      image_urls: item.image_urls ? (Array.isArray(item.image_urls) ? item.image_urls : []) : [],
      is_suspended: isSuspendedBySeller,
      is_admin_suspended: item.admin_suspended || false,
      is_banned: item.is_banned || false,
      approval_status: item.approval_status || 'pending',
      rejection_reason: rejectionReason,
      sold_count: item.sold_count || 0,
      favorite_count: item.wishlist_count || 0,
      view_count: item.view_count || 0,
      delivery_count: item.delivery_count || 0,
      review_count: item.review_count || 0,
      average_rating: item.average_rating || 0,
    };
  });
}

function getProductStats(products: any[]) {
  const totalProducts = products.length;
  
  const activeProducts = products.filter((p) => 
    p.is_available && 
    p.stock_quantity > 0 && 
    !p.is_suspended && 
    !p.is_admin_suspended &&
    !p.is_banned &&
    p.approval_status === 'approved'
  ).length;

  const lowStockProducts = products.filter((p) => 
    p.stock_quantity < 10 && 
    p.stock_quantity > 0 && 
    !p.is_suspended &&
    !p.is_admin_suspended &&
    !p.is_banned &&
    p.approval_status === 'approved'
  ).length;

  const outOfStockProducts = products.filter((p) => 
    p.stock_quantity === 0 && 
    p.approval_status === 'approved' &&
    !p.is_admin_suspended &&
    !p.is_banned
  ).length;

  const suspendedProducts = products.filter((p) => p.is_suspended).length;
  const adminSuspendedProducts = products.filter((p) => p.is_admin_suspended && !p.is_banned).length;
  const bannedProducts = products.filter((p) => p.is_banned).length;
  const pendingProducts = products.filter((p) => p.approval_status === 'pending').length;
  const disapprovedProducts = products.filter((p) => (p.approval_status === 'rejected' || p.approval_status === 'disapproved') && !p.is_banned).length;
  const totalValue = products.reduce((sum, p) => sum + p.price, 0);

  return {
    totalProducts,
    activeProducts,
    lowStockProducts,
    outOfStockProducts,
    suspendedProducts,
    adminSuspendedProducts,
    bannedProducts,
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
    .select('id, approval_status, rejection_reason')
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
  const isApproved = seller.approval_status === 'approved';
  const isPending = seller.approval_status === 'pending';
  const isRejected = seller.approval_status === 'rejected';

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Products Catalog</h1>
          <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 mt-1">Manage and track your product inventory</p>
        </div>
        {isApproved ? (
          <Button asChild className="w-full md:w-auto">
            <Link href="/dashboard/products/new">
              <PlusCircle className="mr-2 h-5 w-5" />
              Add New Product
            </Link>
          </Button>
        ) : (
          <Button disabled className="w-full md:w-auto opacity-50 cursor-not-allowed">
            <PlusCircle className="mr-2 h-5 w-5" />
            Add New Product
          </Button>
        )}
      </div>

      {isPending && (
        <Card className="border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">Seller Account Pending Approval</h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                  Your seller account is currently under review by our admin team. You will be able to add products once your account is approved. 
                  This usually takes 24-48 hours.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isRejected && (
        <Card className="border-l-4 border-red-500 bg-red-50 dark:bg-red-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 dark:text-red-100">Seller Account Rejected</h3>
                <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                  Your seller account application has been rejected.
                  {seller.rejection_reason && (
                    <span className="block mt-2">
                      <strong>Reason:</strong> {seller.rejection_reason}
                    </span>
                  )}
                </p>
                <p className="text-sm text-red-800 dark:text-red-200 mt-2">
                  Please contact support if you believe this is a mistake.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.activeProducts} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.pendingProducts}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <ShoppingBag className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.outOfStockProducts}</div>
            <p className="text-xs text-muted-foreground mt-1">Needs restocking</p>
          </CardContent>
        </Card>

        {stats.bannedProducts > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Banned</CardTitle>
              <Ban className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.bannedProducts}</div>
              <p className="text-xs text-muted-foreground mt-1">Permanently banned</p>
            </CardContent>
          </Card>
        )}

        {stats.adminSuspendedProducts > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admin Suspended</CardTitle>
              <Shield className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.adminSuspendedProducts}</div>
              <p className="text-xs text-muted-foreground mt-1">By administration</p>
            </CardContent>
          </Card>
        )}
      </div>

      {stats.bannedProducts > 0 && (
        <Card className="border-l-4 border-red-500 bg-red-50 dark:bg-red-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Ban className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 dark:text-red-100">Products Permanently Banned</h3>
                <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                  {stats.bannedProducts} product{stats.bannedProducts !== 1 ? 's have' : ' has'} been permanently banned by administration. 
                  These products cannot be edited or reactivated. Please contact support for more information.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {stats.adminSuspendedProducts > 0 && (
        <Card className="border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-purple-600 dark:text-purple-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-purple-900 dark:text-purple-100">Products Suspended by Admin</h3>
                <p className="text-sm text-purple-800 dark:text-purple-200 mt-1">
                  {stats.adminSuspendedProducts} product{stats.adminSuspendedProducts !== 1 ? 's have' : ' has'} been suspended by administration. 
                  You can appeal the suspension from the product actions menu.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {stats.pendingProducts > 0 && (
        <Card className="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Products Pending Approval</h3>
                <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                  {stats.pendingProducts} product{stats.pendingProducts !== 1 ? 's are' : ' is'} currently under review. 
                  They will be visible to buyers once approved.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {stats.disapprovedProducts > 0 && (
        <Card className="border-l-4 border-red-500 bg-red-50 dark:bg-red-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 dark:text-red-100">Products Disapproved</h3>
                <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                  {stats.disapprovedProducts} product{stats.disapprovedProducts !== 1 ? 's were' : ' was'} disapproved. 
                  Check the product table below to see rejection reasons and make necessary corrections.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {stats.totalProducts > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Products</CardTitle>
            <CardDescription>View and manage all your listed products</CardDescription>
          </CardHeader>
          <CardContent>
            <ProductTable data={products} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}