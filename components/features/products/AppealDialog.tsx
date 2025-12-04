'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, Ban } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const appealSchema = z.object({
  message: z.string().min(10, 'Message must be at least 10 characters').max(1000, 'Message must be less than 1000 characters'),
});

type AppealFormData = z.infer<typeof appealSchema>;

interface AppealDialogProps {
  productId: string;
  productName: string;
  isBanned?: boolean;
}

export function AppealDialog({ productId, productName, isBanned = false }: AppealDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const router = useRouter();
  const form = useForm<AppealFormData>({
    resolver: zodResolver(appealSchema),
    defaultValues: {
      message: '',
    },
  });

  // Prevent opening if product is banned
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && isBanned) {
      toast.error('Banned products cannot be appealed. Contact support for assistance.');
      return;
    }
    setOpen(newOpen);
  };

  const onSubmit = async (data: AppealFormData) => {
    // Double-check banned status
    if (isBanned) {
      toast.error('Banned products cannot be appealed');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    
    try {
      const response = await fetch('/api/appeals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          message: data.message,
        }),
      });

      const rawText = await response.text();
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const errorMsg = `Server error (${response.status}): Response is not JSON`;
        setErrorMessage(errorMsg);
        toast.error('Server returned an invalid response format');
        return;
      }

      // Parse JSON
      let result;
      try {
        result = JSON.parse(rawText);
      } catch (parseError) {
        setErrorMessage('Failed to parse server response');
        toast.error('Invalid JSON response from server');
        return;
      }

      // Handle errors
      if (!response.ok) {
        const errorMsg = result?.error || result?.message || `Server error: ${response.status}`;
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
        return;
      }

      // Success
      toast.success('Appeal submitted successfully. Admin will review soon.');
      setOpen(false);
      form.reset();
      setErrorMessage('');
      router.refresh();
      
    } catch (error) {
      let errorMsg = 'An unexpected error occurred';
      
      if (error instanceof TypeError) {
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          errorMsg = 'Network error: Unable to reach server. Please check your connection.';
        } else {
          errorMsg = `Network error: ${error.message}`;
        }
      } else if (error instanceof Error) {
        errorMsg = error.message;
      }
      
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show different button for banned products
  if (isBanned) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full opacity-50 cursor-not-allowed"
        disabled
      >
        <Ban className="h-4 w-4 mr-2" />
        Appeals Not Allowed
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => handleOpenChange(true)}
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        Send Appeal
      </Button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Appeal Suspension</DialogTitle>
          <DialogDescription>
            Request admin review for "{productName}". Explain why this product should be unsuspended.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
                <p className="font-semibold">Error:</p>
                <p>{errorMessage}</p>
              </div>
            )}
            
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Appeal Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Explain why this product should be unsuspended..."
                      className="resize-none"
                      rows={5}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Appeal'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}