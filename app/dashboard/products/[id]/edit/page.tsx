// app/dashboard/products/[id]/edit/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { EditProductForm } from '@/components/features/products/EditProductForm';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface EditProductPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ resubmit?: string }>;
}

export default async function EditProductPage({ params, searchParams }: EditProductPageProps) {
  const { id } = await params;
  const { resubmit } = await searchParams;
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: sellerData } = await supabase
    .from('sellers')
    .select('id, university_id, universities (state, name)')
    .eq('user_id', user.id)
    .single();

  if (!sellerData) redirect('/dashboard');

  const universities = sellerData.universities;
  if (!universities) redirect('/dashboard');

  const sellerState = Array.isArray(universities) 
    ? universities[0]?.state 
    : (universities as { state: string; name: string }).state;

  if (!sellerState) redirect('/dashboard');

  const { data: product } = await supabase
    .from('products')
    .select(`
      *,
      product_approvals!inner(rejection_reason)
    `)
    .eq('id', id)
    .single();

  if (!product || product.seller_id !== sellerData.id) redirect('/dashboard/products');

  // Get rejection reason
  const rejectionReason = product.product_approvals?.[0]?.rejection_reason || null;

  // ✅ ALLOW editing rejected products for resubmission
  // ❌ BLOCK editing pending or admin suspended products
  if (product.approval_status === 'pending') {
    redirect('/dashboard/products');
  }

  if (product.admin_suspended) {
    redirect('/dashboard/products');
  }

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .order('name');

  const isResubmit = resubmit === 'true' || product.approval_status === 'rejected' || product.approval_status === 'disapproved';

  return (
    <div className="container max-w-4xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          {isResubmit ? 'Fix & Resubmit Product' : 'Edit Product'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {isResubmit 
            ? 'Make the required changes and resubmit for approval' 
            : 'Update your product information'
          }
        </p>
      </div>

      {isResubmit && rejectionReason && (
        <Card className="mb-6 border-l-4 border-yellow-500 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900">Rejection Reason</h3>
                <p className="text-sm text-yellow-800 mt-1">{rejectionReason}</p>
                <p className="text-sm text-yellow-700 mt-2 font-medium">
                  Please address the issues above before resubmitting.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <EditProductForm
        product={product}
        categories={categories || []}
        sellerState={sellerState}
        isResubmit={isResubmit}
        rejectionReason={rejectionReason}
      />
    </div>
  );
}