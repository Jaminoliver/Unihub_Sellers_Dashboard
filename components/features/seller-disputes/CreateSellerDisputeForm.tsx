'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle } from 'lucide-react';

interface CreateSellerDisputeFormProps {
  sellerId: string;
}

const DISPUTE_TYPES = [
  { value: 'account_suspension', label: 'Account Suspension', description: 'Appeal account suspension or restrictions' },
  { value: 'product_rejection', label: 'Product Rejection', description: 'Dispute product rejection decision' },
  { value: 'commission_dispute', label: 'Commission Error', description: 'Report incorrect commission calculation' },
  { value: 'payout_delay', label: 'Payout Delay', description: 'Report delayed or incorrect payouts' },
  { value: 'unfair_review', label: 'Unfair Review', description: 'Contest unfair buyer review or rating' },
  { value: 'verification_issue', label: 'Verification Issue', description: 'Appeal verification rejection' },
  { value: 'policy_disagreement', label: 'Policy Disagreement', description: 'Disagree with platform policy or decision' },
  { value: 'other', label: 'Other Issue', description: 'Other concerns not listed above' },
];

const PRIORITY_LEVELS = [
  { value: 'low', label: 'Low', description: 'Can wait a few days' },
  { value: 'medium', label: 'Medium', description: 'Needs attention soon' },
  { value: 'high', label: 'High', description: 'Important, affecting business' },
  { value: 'urgent', label: 'Urgent', description: 'Critical, needs immediate attention' },
];

export function CreateSellerDisputeForm({ sellerId }: CreateSellerDisputeFormProps) {
  const router = useRouter();
  const supabase = createClient();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    dispute_type: '',
    title: '',
    description: '',
    priority: 'medium',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.dispute_type || !formData.title || !formData.description) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.description.length < 50) {
      setError('Please provide a detailed description (at least 50 characters)');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: insertError } = await supabase
        .from('seller_disputes')
        .insert({
          seller_id: sellerId,
          dispute_type: formData.dispute_type,
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          status: 'open',
          evidence_urls: null,
        });

      if (insertError) throw insertError;

      // Success - redirect to disputes page
      router.push('/dashboard/seller-disputes');
      router.refresh();
    } catch (err: any) {
      console.error('Error creating dispute:', err);
      setError(err.message || 'Failed to create dispute. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-900">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Dispute Type */}
          <div className="space-y-2">
            <Label htmlFor="dispute_type">Dispute Type *</Label>
            <select
              id="dispute_type"
              value={formData.dispute_type}
              onChange={(e) => setFormData({ ...formData, dispute_type: e.target.value })}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            >
              <option value="">Select dispute type...</option>
              {DISPUTE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label} - {type.description}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Dispute Title *</Label>
            <Input
              id="title"
              type="text"
              placeholder="Brief summary of your concern..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              maxLength={100}
              required
            />
            <p className="text-xs text-gray-500">{formData.title.length}/100 characters</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Detailed Description *</Label>
            <Textarea
              id="description"
              placeholder="Provide detailed information about your concern. Include dates, order numbers, amounts, or any relevant details..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={8}
              required
            />
            <p className="text-xs text-gray-500">
              {formData.description.length} characters (minimum 50)
            </p>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority Level</Label>
            <select
              id="priority"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              {PRIORITY_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label} - {level.description}
                </option>
              ))}
            </select>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Before you submit:</h4>
            <ul className="space-y-1 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Provide as much detail as possible to help us understand your concern</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Include relevant order numbers, product IDs, or transaction details</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Admin will review and respond within 24-48 hours</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>You can add more details after submission if needed</span>
              </li>
            </ul>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-orange-500 hover:bg-orange-600 flex-1"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Dispute'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}