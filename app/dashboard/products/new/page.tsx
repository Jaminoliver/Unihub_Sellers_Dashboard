import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AddProductForm } from '@/components/features/products/AddProductForm';
import { redirect } from 'next/navigation';

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

async function getSellerState(supabase: any, userId: string) {
  const { data } = await supabase
    .from('sellers')
    .select('state, university:universities(state)')
    .eq('user_id', userId)
    .single();
  
  return data?.state || data?.university?.state || '';
}

async function getUniversitiesByState(supabase: any, state: string) {
  if (!state) return [];
  
  const { data } = await supabase
    .from('universities')
    .select('id, name')
    .eq('state', state)
    .eq('is_active', true)
    .order('name');
  
  return data || [];
}

export default async function AddNewProductPage() {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const sellerState = await getSellerState(supabase, user.id);
  const [categories, universities] = await Promise.all([
    getCategories(supabase),
    getUniversitiesByState(supabase, sellerState)
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Add New Product</h1>
        <p className="text-gray-500 mt-1">
          Fill in the details below to list your new product.
        </p>
      </div>
      
      <AddProductForm categories={categories} universities={universities} sellerState={sellerState} />
    </div>
  );
}