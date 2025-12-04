// app/dashboard/products/[id]/edit/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { EditProductForm } from '@/components/features/products/EditProductForm';

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
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
    .select('*')
    .eq('id', id)
    .single();

  if (!product || product.seller_id !== sellerData.id) redirect('/dashboard/products');

  // ✅ BLOCK editing unapproved/suspended products
  if (product.approval_status === 'pending' || 
      product.approval_status === 'rejected' ||
      product.admin_suspended) {
    redirect('/dashboard/products');
  }

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .order('name');

  return (
    <div className="container max-w-4xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Product</h1>
        <p className="text-muted-foreground mt-2">Update your product information</p>
      </div>

      <EditProductForm
        product={product}
        categories={categories || []}
        sellerState={sellerState}
      />
    </div>
  );
}