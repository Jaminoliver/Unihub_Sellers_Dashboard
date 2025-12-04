'use client';

import { useState } from 'react';
import { MoreHorizontal, Edit, Trash2, Pause, Play, MessageCircle } from 'lucide-react';
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
import { AppealDialog } from './AppealDialog';

interface ProductTableActionsProps {
  productId: string;
  productName: string;
  isSuspended: boolean;
  isAdminSuspended: boolean;
  isBanned: boolean;
  isDisapprovedOrAdminSuspended: boolean;
  banReason?: string | null;
  approvalStatus: string;
}

export function ProductTableActions({
  productId,
  productName,
  isSuspended,
  isAdminSuspended,
  isBanned,
  isDisapprovedOrAdminSuspended,
  banReason,
  approvalStatus,
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

  // BANNED PRODUCTS: Only show delete button
  if (isBanned) {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Banned Product?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{productName}" from your inventory.
                {banReason && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                    <span className="text-sm font-semibold text-red-900 block">Ban Reason:</span>
                    <span className="text-sm text-red-800 mt-1 block">{banReason}</span>
                  </div>
                )}
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

  // PENDING APPROVAL: Only show delete button
  if (approvalStatus === 'pending') {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Pending Product?</AlertDialogTitle>
              <AlertDialogDescription>
                This product is currently pending approval. Deleting it will remove it from the review queue.
                This action cannot be undone.
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

  // DISAPPROVED PRODUCTS: Only show delete button
  if (isDisapprovedOrAdminSuspended && !isAdminSuspended) {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Disapproved Product?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{productName}" from your inventory.
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

  // ADMIN SUSPENDED: Only show appeal button
  if (isAdminSuspended) {
    return (
      <AppealDialog productId={productId} productName={productName} />
    );
  }

  // APPROVED PRODUCTS (In Stock/Out of Stock/Seller Suspended): Full menu
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