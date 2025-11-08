'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface SettingsFormProps {
  seller: {
    id: string;
    business_name: string;
    full_name: string;
    email: string;
    phone_number: string;
    pickup_address: string;
    description?: string;
    store_category_id?: string;
    university_id?: string;
  };
  categories: Array<{ id: string; name: string }>;
  states: Array<{ id: string; name: string }>;
  initialStateId: string;
}

export function SettingsForm({
  seller,
  categories,
  states,
  initialStateId,
}: SettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [universities, setUniversities] = useState<Array<{ id: string; name: string; short_name?: string }>>([]);
  const [loadingUniversities, setLoadingUniversities] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    business_name: seller.business_name || '',
    full_name: seller.full_name || '',
    phone_number: seller.phone_number || '',
    pickup_address: seller.pickup_address || '',
    description: seller.description || '',
    store_category_id: seller.store_category_id || '',
    state_id: initialStateId || '',
    university_id: seller.university_id || '',
  });

  // Fetch universities when state changes
  useEffect(() => {
    if (formData.state_id) {
      fetchUniversities(formData.state_id);
    } else {
      setUniversities([]);
      setFormData(prev => ({ ...prev, university_id: '' }));
    }
  }, [formData.state_id]);

  // Fetch universities on initial load if state is already selected
  useEffect(() => {
    if (initialStateId) {
      fetchUniversities(initialStateId);
    }
  }, [initialStateId]);

  const fetchUniversities = async (stateId: string) => {
    setLoadingUniversities(true);
    try {
      const supabase = createClient();
      
      // Find the state name from state_id
      const selectedState = states.find(s => s.id === stateId);
      
      if (!selectedState) {
        setUniversities([]);
        setLoadingUniversities(false);
        return;
      }

      // Query using the state name (existing column)
      const { data, error } = await supabase
        .from('universities')
        .select('id, name, short_name')
        .eq('state', selectedState.name)  // ✅ Using existing 'state' column
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching universities:', error);
        setUniversities([]);
      } else {
        setUniversities(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
      setUniversities([]);
    } finally {
      setLoadingUniversities(false);
    }
  };

  const handleStateChange = (stateId: string) => {
    setFormData(prev => ({
      ...prev,
      state_id: stateId,
      university_id: '', // Reset university when state changes
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('sellers')
        .update({
          business_name: formData.business_name,
          full_name: formData.full_name,
          phone_number: formData.phone_number,
          pickup_address: formData.pickup_address,
          description: formData.description || null,
          store_category_id: formData.store_category_id || null,
          university_id: formData.university_id || null,
        })
        .eq('id', seller.id);

      if (error) {
        console.error('Error updating seller:', error);
        alert('Failed to update settings. Please try again.');
      } else {
        alert('Settings updated successfully!');
        router.refresh();
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Business Information</h2>
        <p className="text-sm text-gray-500 mb-6">
          This information will be visible to customers on your store page.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Store Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Store Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.business_name}
              onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Edo E Gadgets"
            />
          </div>

          {/* State */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              State <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.state_id}
              onChange={(e) => handleStateChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select your state</option>
              {states.map((state) => (
                <option key={state.id} value={state.id}>
                  {state.name}
                </option>
              ))}
            </select>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="John Gilmore"
            />
          </div>

          {/* University */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              University <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.university_id}
              onChange={(e) => setFormData({ ...formData, university_id: e.target.value })}
              disabled={!formData.state_id || loadingUniversities}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">
                {loadingUniversities
                  ? 'Loading universities...'
                  : !formData.state_id
                  ? 'Select a state first'
                  : 'Select your university'}
              </option>
              {universities.map((uni) => (
                <option key={uni.id} value={uni.id}>
                  {uni.name} {uni.short_name ? `(${uni.short_name})` : ''}
                </option>
              ))}
            </select>
            {!formData.state_id && (
              <p className="text-xs text-gray-500 mt-1">Please select a state first</p>
            )}
          </div>

          {/* Business Email (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Email
            </label>
            <input
              type="email"
              value={seller.email}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed here</p>
          </div>

          {/* Store Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Store Category (Optional)
            </label>
            <select
              value={formData.store_category_id}
              onChange={(e) => setFormData({ ...formData, store_category_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+2348103312492"
            />
          </div>

          {/* Local Government Area (Optional) - Placeholder for future */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Local Government Area (Optional)
            </label>
            <input
              type="text"
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed"
              placeholder="e.g., Ojo"
            />
            <p className="text-xs text-gray-500 mt-1">Coming soon</p>
          </div>

          {/* Pickup Address */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pickup Address <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={formData.pickup_address}
              onChange={(e) => setFormData({ ...formData, pickup_address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="number 13, thinkers corner estate"
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Store Description (Optional)
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Tell customers about your store, what you sell, your specialty..."
            />
          </div>
        </div>
      </div>

      {/* Bank Details Section (Optional - Placeholder for future) */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Bank Details (Optional)</h2>
        <p className="text-sm text-gray-500 mb-6">
          Add your bank details for seamless payments.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bank Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bank Name
            </label>
            <input
              type="text"
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed"
              placeholder="e.g., GTBank"
            />
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Number
            </label>
            <input
              type="text"
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed"
              placeholder="e.g., 0123456789"
            />
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          Bank details feature coming soon
        </p>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </span>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </form>
  );
}