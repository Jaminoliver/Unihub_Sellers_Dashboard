'use client';

import * as React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  ColumnFiltersState,
  getFilteredRowModel,
} from '@tanstack/react-table';
import { format } from 'date-fns';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

import type { Product } from '@/lib/types';
import { ProductTableActions } from './ProductTableActions';

// Define the columns for the table, matching the UI sample
export const columns: ColumnDef<Product>[] = [
  // Checkbox column
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },

  // Product column (Image + Name)
  {
    accessorKey: 'name',
    header: 'Product',
    cell: ({ row }) => {
      // Get the first image URL, or a placeholder
      const imageUrl =
        row.original.image_urls && row.original.image_urls.length > 0
          ? row.original.image_urls[0]
          : 'https://placehold.co/60x60/f97316/white?text=Img';

      return (
        <div className="flex items-center gap-3">
          <Image
            src={imageUrl}
            alt={row.original.name}
            width={40}
            height={40}
            className="rounded-md object-cover w-10 h-10"
          />
          <span className="font-medium">{row.original.name}</span>
        </div>
      );
    },
  },

  // Status column
  {
    accessorKey: 'is_available',
    header: 'Status',
    cell: ({ row }) => {
      const isAvailable = row.getValue('is_available');
      return (
        <Badge variant={isAvailable ? 'default' : 'destructive'}
          className={isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
        >
          {isAvailable ? 'In Stock' : 'Out of Stock'}
        </Badge>
      );
    },
  },

  // Price column
  {
    accessorKey: 'price',
    header: () => <div className="text-right">Price</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('price'));
      const formatted = new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
      }).format(amount);

      return <div className="text-right font-medium">{formatted}</div>;
    },
  },

  // Stock column
  {
    accessorKey: 'stock_quantity',
    header: 'Stock',
    cell: ({ row }) => {
      const stock = row.getValue('stock_quantity') as number;
      return (
        <div className={stock < 10 ? 'text-red-600 font-medium' : ''}>
          {stock}
        </div>
      )
    },
  },

  // Date Added column
  {
    accessorKey: 'created_at',
    header: 'Date Added',
    cell: ({ row }) => {
      const date = new Date(row.getValue('created_at'));
      return <div>{format(date, 'MMM dd, yyyy')}</div>;
    },
  },

  // Actions column (Edit, Delete)
  {
    id: 'actions',
    cell: ({ row }) => {
      return <ProductTableActions productId={row.original.id} />;
    },
  },
];

interface ProductTableProps {
  data: Product[];
}

export function ProductTable({ data }: ProductTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
  });

  return (
    <div className="bg-white border rounded-lg shadow-sm">
      {/* Filtering and Bulk Actions */}
      <div className="flex items-center justify-between p-4 border-b">
        <Input
          placeholder="Filter by product name..."
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('name')?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        {table.getFilteredSelectedRowModel().rows.length > 0 && (
          <Button variant="destructive" size="sm">
            Delete ({table.getFilteredSelectedRowModel().rows.length})
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No products found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 p-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}