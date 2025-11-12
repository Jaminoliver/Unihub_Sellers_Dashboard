// app/dashboard/products/[id]/edit/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { EditProductForm } from '@/components/features/products/EditProductForm';

interface EditProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  
  console.log('=== EDIT PAGE LOADING ===');
  console.log('Product ID:', id);

  const supabase = await createServerSupabaseClient();

  // Get authenticated user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  console.log('User:', user?.id);
  console.log('User error:', userError);

  if (!user) {
    console.log('No user found, redirecting to login');
    redirect('/login');
  }

  // Get seller with university information to get state
  const { data: sellerData, error: sellerError } = await supabase
    .from('sellers')
    .select(`
      id,
      university_id,
      universities (
        state,
        name
      )
    `)
    .eq('user_id', user.id)
    .single();

  console.log('Seller:', sellerData);
  console.log('Seller error:', sellerError);

  // ✅ FIX: Check if seller and universities exist
  if (!sellerData) {
    console.log('No seller found, redirecting to dashboard');
    redirect('/dashboard');
  }

  // ✅ FIX: Handle the universities property correctly
  // Supabase can return null, a single object, or an array depending on the relationship
  const universities = sellerData.universities;
  
  if (!universities) {
    console.log('No university found for seller, redirecting to dashboard');
    redirect('/dashboard');
  }

  // ✅ FIX: Get the state - handle both single object and array
  let sellerState: string;
  
  if (Array.isArray(universities)) {
    // If it's an array, take the first element
    sellerState = universities[0]?.state;
  } else {
    // If it's a single object, use it directly
    sellerState = (universities as { state: string; name: string }).state;
  }

  if (!sellerState) {
    console.log('No state found for seller university, redirecting to dashboard');
    redirect('/dashboard');
  }

  console.log('Seller State:', sellerState);

  // Fetch the product
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  console.log('Product:', product);
  console.log('Product error:', productError);

  if (productError || !product) {
    console.log('Product not found, redirecting to products list');
    redirect('/dashboard/products');
  }

  // Verify ownership
  if (product.seller_id !== sellerData.id) {
    console.log('Not product owner, redirecting to products list');
    redirect('/dashboard/products');
  }

  // Fetch categories
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('id, name')
    .order('name');

  console.log('Categories:', categories?.length);
  console.log('Categories error:', categoriesError);

  return (
    <div className="container max-w-4xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Product</h1>
        <p className="text-muted-foreground mt-2">
          Update your product information
        </p>
      </div>

      <EditProductForm
        product={product}
        categories={categories || []}
        sellerState={sellerState}
      />
    </div>
  );
}