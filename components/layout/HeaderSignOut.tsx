'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client'; // Use your client file path
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

export function HeaderSignOut() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh(); // Triggers middleware redirect
  };

  return (
    <DropdownMenuItem
      className="text-red-600 focus:bg-red-50 focus:text-red-700"
      onClick={handleSignOut}
    >
      <LogOut className="mr-2 h-4 w-4" />
      <span>Sign Out</span>
    </DropdownMenuItem>
  );
}