'use client';

import { useState } from 'react';
import { MoreHorizontal, Edit, Trash2, Pause, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { deleteProduct } from '@/app/dashboard/products/new/actions';
import { unsuspendProduct } from '@/app/dashboard/products/new/actions';
import { SuspendProductDialog } from './SuspendProductDialog';

interface ProductTableActionsProps {
  productId: string;
  productName: string;
  isSuspended: boolean;
}

export function ProductTableActions({
  productId,
  productName,
  isSuspended,
}: ProductTableActionsProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUnsuspending, setIsUnsuspending] = useState(false);

  const handleEdit = () => {
    router.push(`/dashboard/products/${productId}/edit`);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteProduct(productId);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Product deleted successfully');
      setShowDeleteDialog(false);
      router.refresh();
    }

    setIsDeleting(false);
  };

  const handleUnsuspend = async () => {
    setIsUnsuspending(true);
    const result = await unsuspendProduct(productId);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message || 'Product unsuspended');
      router.refresh();
    }

    setIsUnsuspending(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>

          {isSuspended ? (
            <DropdownMenuItem
              onClick={handleUnsuspend}
              disabled={isUnsuspending}
            >
              <Play className="mr-2 h-4 w-4" />
              {isUnsuspending ? 'Unsuspending...' : 'Unsuspend'}
            </DropdownMenuItem>
          ) : (
            <SuspendProductDialog
              productId={productId}
              productName={productName}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Pause className="mr-2 h-4 w-4" />
                  Suspend
                </DropdownMenuItem>
              }
            />
          )}

          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            className="text-red-600"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{productName}" and remove all
              associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}