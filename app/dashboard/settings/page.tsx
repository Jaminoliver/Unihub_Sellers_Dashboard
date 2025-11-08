import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SettingsForm } from '@/components/features/sellers/SettingsForm';

// Define types
type State = { id: string; name: string };
type Category = { id: string; name: string };

// Helper function to get the seller's data
async function getSellerData(supabase: any, userId: string) {
  console.log('Fetching seller for user_id:', userId);
  
  const { data: seller, error } = await supabase
    .from('sellers')
    .select(
      `
      id,
      business_name,
      full_name,
      email,
      phone_number,
      pickup_address,
      description,
      store_category_id,
      university_id
    `
    )
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching seller data:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
  }
  
  console.log('Seller data found:', seller ? 'Yes' : 'No');
  
  return seller;
}

// Helper function to get categories
async function getCategories(supabase: any): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    console.error('Categories error details:', JSON.stringify(error, null, 2));
    return [];
  }
  
  console.log('Categories fetched:', data?.length || 0);
  return data || [];
}

// Helper function to get all states
async function getStates(supabase: any): Promise<State[]> {
  const { data, error } = await supabase
    .from('states')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching states:', error);
    console.error('States error details:', JSON.stringify(error, null, 2));
    return [];
  }
  
  console.log('States fetched:', data?.length || 0);
  return data || [];
}

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  console.log('Authenticated user:', user.id);

  // Fetch all data in parallel
  const [seller, categories, states] = await Promise.all([
    getSellerData(supabase, user.id),
    getCategories(supabase),
    getStates(supabase),
  ]);

  console.log('Data summary:', {
    seller: seller ? 'Found' : 'Not found',
    categories: categories.length,
    states: states.length,
  });

  if (!seller) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-red-600">Seller Profile Not Found</h1>
          <p className="text-gray-500 mt-2">
            No seller profile exists for this account. Please contact support or create a seller profile first.
          </p>
          <div className="mt-4 p-4 bg-gray-100 rounded-md">
            <p className="text-sm text-gray-600">User ID: {user.id}</p>
            <p className="text-sm text-gray-600">Email: {user.email}</p>
          </div>
        </div>
      </div>
    );
  }

  // If the seller already has a university, get its state using the 'state' column
  let initialStateId = '';
  if (seller.university_id) {
    const { data: uniData } = await supabase
      .from('universities')
      .select('state')
      .eq('id', seller.university_id)
      .single();
      
    if (uniData) {
      // Find the state_id from the state name
      const matchingState = states.find((s) => s.name === uniData.state);
      if (matchingState) {
        initialStateId = matchingState.id;
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">
          Manage your business information and store settings.
        </p>
      </div>

      {/* Pass all data to the client form */}
      <SettingsForm
        seller={seller}
        categories={categories}
        states={states}
        initialStateId={initialStateId}
      />
    </div>
  );
}