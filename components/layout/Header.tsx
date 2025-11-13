'use client'

import { Search, Bell, HelpCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { HeaderSignOut } from './HeaderSignOut'
import { NotificationsDropdown } from '@/components/notifications/notifications-dropdown'
import { useNotifications } from '@/hooks/use-notifications'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface HeaderProps {
  sellerName?: string
  userId?: string
}

export function Header({ sellerName, userId: initialUserId }: HeaderProps) {
  const [userId, setUserId] = useState<string | undefined>(initialUserId)
  const [displayName, setDisplayName] = useState(sellerName || 'Seller')
  const supabase = createClient()

  useEffect(() => {
    async function fetchUserData() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setUserId(user.id)
        
        // Fetch seller profile
        const { data: seller } = await supabase
          .from('sellers')
          .select('business_name, profiles(full_name)')
          .eq('user_id', user.id)
          .single()
        
        if (seller) {
          const name = seller.business_name || (seller.profiles as any)?.full_name || user.email?.split('@')[0] || 'Seller'
          setDisplayName(name)
        }
      }
    }

    if (!initialUserId || !sellerName) {
      fetchUserData()
    }
  }, [initialUserId, sellerName, supabase])

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="sticky top-0 z-40 border-b bg-white">
      <div className="flex h-16 items-center gap-4 px-6">
        {/* Search Bar */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              placeholder="Search orders, products..."
              className="pl-10 bg-gray-50 border-gray-200"
            />
          </div>
        </div>

        {/* Right Side - Notifications, Help, Avatar */}
        <div className="flex items-center gap-3">
          {/* Notifications - Using our new NotificationsDropdown */}
          {userId && <NotificationsDropdown userId={userId} />}

          {/* Help */}
          <Button variant="ghost" size="icon">
            <HelpCircle className="h-5 w-5" />
          </Button>

          {/* User Avatar & Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary text-white font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-gray-500">Seller Account</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Verification</DropdownMenuItem>
              <DropdownMenuSeparator />
              <HeaderSignOut />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}