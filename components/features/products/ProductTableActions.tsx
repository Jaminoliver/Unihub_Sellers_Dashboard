'use client';

import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface ProductTableActionsProps {
  productId: string;
}

export function ProductTableActions({ productId }: ProductTableActionsProps) {
  const onEdit = () => {
    // Logic to open edit modal or navigate to edit page
    console.log('Edit product:', productId);
  };

  const onDelete = async () => {
    // Logic to delete the product
    // We'll add this later with a confirmation modal
    if (confirm('Are you sure you want to delete this product?')) {
      console.log('Delete product:', productId);
      // await supabase.from('products').delete().eq('id', productId)
      // router.refresh()
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Edit className="mr-2 h-4 w-4" />
          <span>Edit</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-red-600 focus:text-red-700 focus:bg-red-50"
          onClick={onDelete}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Delete</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}