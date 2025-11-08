'use client';

import { useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { updateBankDetails } from '@/app/dashboard/products/new/actions';import { toast } from 'sonner';

// Import Shadcn UI components
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NIGERIAN_BANKS } from '@/lib/banks';
import { CheckCircle2, Edit2, Building2, CreditCard, User } from 'lucide-react';

// Define the type for the seller prop
interface SellerData {
  bank_name: string | null;
  account_name: string | null;
  bank_account_number: string | null;
  bank_verified: boolean;
  bank_code: string | null;
}

// Initial state for the form
const initialState = {
  error: null,
  message: null,
};

// Submit button component
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? 'Verifying & Saving...' : 'Save Account'}
    </Button>
  );
}

// Bank Details Display Card
function BankDetailsDisplay({ 
  seller, 
  onEdit 
}: { 
  seller: SellerData; 
  onEdit: () => void;
}) {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Bank Account
              {seller.bank_verified && (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              )}
            </CardTitle>
            <CardDescription>
              Your registered bank account for receiving payouts
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit2 className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bank Name */}
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-blue-100 p-2">
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Bank Name</p>
            <p className="font-medium text-gray-900">{seller.bank_name}</p>
          </div>
        </div>

        {/* Account Number */}
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-green-100 p-2">
            <CreditCard className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Account Number</p>
            <p className="font-medium text-gray-900">{seller.bank_account_number}</p>
          </div>
        </div>

        {/* Account Name */}
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-purple-100 p-2">
            <User className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Account Name</p>
            <p className="font-medium text-gray-900">{seller.account_name}</p>
          </div>
        </div>

        {/* Verification Status */}
        <div className="mt-4 pt-4 border-t">
          {seller.bank_verified ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Account Verified</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-yellow-600">
              <span className="font-medium">⚠ Pending Verification</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Bank Details Form
function BankDetailsEditForm({ 
  seller, 
  onCancel 
}: { 
  seller: SellerData; 
  onCancel: () => void;
}) {
  const [state, formAction] = useFormState(updateBankDetails, initialState);

  useEffect(() => {
    if (state.message) {
      toast.success(state.message);
      // Refresh the page to show updated details
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
    if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form action={formAction}>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Update Bank Account</CardTitle>
          <CardDescription>
            Your account name must match the name on your bank account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Bank Name */}
          <div className="space-y-2">
            <Label htmlFor="bank_code">Bank Name</Label>
            <Select
              name="bank_code"
              defaultValue={seller.bank_code || ''}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your bank" />
              </SelectTrigger>
              <SelectContent>
                {NIGERIAN_BANKS.map((bank) => (
                  <SelectItem key={bank.code} value={bank.code}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Account Number */}
          <div className="space-y-2">
            <Label htmlFor="account_number">Account Number</Label>
            <Input
              id="account_number"
              name="account_number"
              placeholder="10-digit account number"
              defaultValue={seller.bank_account_number || ''}
              maxLength={10}
              required
            />
          </div>

          {/* Account Name */}
          <div className="space-y-2">
            <Label htmlFor="account_name">Account Name (as registered)</Label>
            <Input
              id="account_name"
              name="account_name"
              placeholder="The name on your account"
              defaultValue={seller.account_name || ''}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex gap-3">
          <SubmitButton />
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

// Main Component
export function BankVerificationPage({ seller }: { seller: SellerData }) {
  const [isEditing, setIsEditing] = useState(false);
  const hasBankDetails = !!seller.bank_account_number;

  // Show form by default if no bank details exist
  useEffect(() => {
    if (!hasBankDetails) {
      setIsEditing(true);
    }
  }, [hasBankDetails]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Bank Verification</h1>
        <p className="text-gray-500 mt-1">
          Add or update your bank details for payouts.
        </p>
      </div>

      {/* Display or Edit Mode */}
      {!isEditing && hasBankDetails ? (
        <BankDetailsDisplay 
          seller={seller} 
          onEdit={() => setIsEditing(true)} 
        />
      ) : (
        <BankDetailsEditForm 
          seller={seller} 
          onCancel={() => setIsEditing(false)} 
        />
      )}
    </div>
  );
}