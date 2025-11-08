'use client';

import { useState } from 'react';
import { Clock, Pause } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { suspendProduct } from '@/app/dashboard/products/new/actions';

interface SuspendProductDialogProps {
  productId: string;
  productName: string;
  trigger?: React.ReactNode;
}

const SUSPENSION_PRESETS = [
  { label: '1 Day', days: 1 },
  { label: '3 Days', days: 3 },
  { label: '1 Week', days: 7 },
  { label: '2 Weeks', days: 14 },
  { label: '1 Month', days: 30 },
];

export function SuspendProductDialog({
  productId,
  productName,
  trigger,
}: SuspendProductDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number>(7);
  const [customDays, setCustomDays] = useState<string>('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSuspend = async () => {
    setIsLoading(true);
    const days = customDays ? parseInt(customDays) : selectedDays;

    if (!days || days < 1) {
      toast.error('Please select a valid suspension duration');
      setIsLoading(false);
      return;
    }

    const result = await suspendProduct(productId, days, reason || undefined);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message || 'Product suspended successfully');
      setOpen(false);
      // Reset form
      setSelectedDays(7);
      setCustomDays('');
      setReason('');
    }

    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Pause className="h-4 w-4 mr-2" />
            Suspend
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg">Suspend Product</DialogTitle>
          <DialogDescription className="text-sm">
            Temporarily hide "{productName}" from buyers.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {/* Preset Durations */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Select Duration</Label>
            <div className="grid grid-cols-3 gap-2">
              {SUSPENSION_PRESETS.map((preset) => (
                <Button
                  key={preset.days}
                  type="button"
                  variant={selectedDays === preset.days ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedDays(preset.days);
                    setCustomDays('');
                  }}
                  className="h-12 text-xs"
                >
                  <div className="flex flex-col items-center">
                    <Clock className="h-3 w-3 mb-1" />
                    <span>{preset.label}</span>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Duration */}
          <div className="space-y-2">
            <Label htmlFor="custom-days" className="text-sm font-medium">
              Or Enter Custom Days
            </Label>
            <input
              id="custom-days"
              type="number"
              min="1"
              max="365"
              placeholder="e.g., 5"
              value={customDays}
              onChange={(e) => {
                setCustomDays(e.target.value);
                setSelectedDays(0); // Deselect presets
              }}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Reason (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Reason (Optional)
            </Label>
            <Textarea
              id="reason"
              placeholder="e.g., Restocking, Maintenance..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              For your reference only, not shown to buyers.
            </p>
          </div>

          {/* Preview */}
          <div className="rounded-md bg-muted p-3 text-xs">
            <p className="font-medium mb-1">Preview:</p>
            <p className="text-muted-foreground">
              Suspended for{' '}
              <span className="font-semibold text-foreground">
                {customDays || selectedDays} day(s)
              </span>
              , available on{' '}
              <span className="font-semibold text-foreground">
                {new Date(
                  Date.now() +
                    (customDays ? parseInt(customDays) : selectedDays) *
                      24 *
                      60 *
                      60 *
                      1000
                ).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </p>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
            size="sm"
          >
            Cancel
          </Button>
          <Button onClick={handleSuspend} disabled={isLoading} size="sm">
            {isLoading ? 'Suspending...' : 'Suspend Product'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}