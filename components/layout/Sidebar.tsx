'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  PlusCircle,
  BarChart3,
  Megaphone,
  Wallet,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Orders',
    href: '/dashboard/orders',
    icon: ShoppingCart,
  },
  {
    name: 'Products',
    href: '/dashboard/products',
    icon: Package,
  },
  {
    name: 'Add Product',
    href: '/dashboard/products/new',
    icon: PlusCircle,
  },
  {
    name: 'Analytics / Sales',
    href: '/dashboard/analytics',
    icon: BarChart3,
  },
  {
    name: 'Promotions / Ads',
    href: '/dashboard/promotions',
    icon: Megaphone,
  },
  {
  name: 'Finance',
  href: '/dashboard/finance',
  icon: Wallet,
},
  {
    name: 'Account / Verification',
    href: '/dashboard/account/verification',
    icon: Users,
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
]

interface SidebarProps {
  sellerName?: string
}

export function Sidebar({ sellerName = 'BrightBooks NG' }: SidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div
      className={cn(
        'relative flex flex-col bg-navy-500 text-white transition-all duration-300',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo/Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-navy-400">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white font-bold text-lg">
            U
          </div>
          {!isCollapsed && (
            <span className="font-semibold text-lg">UniHub Seller</span>
          )}
        </div>
      </div>

      {/* Collapse Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 z-50 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary-600 transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-300 hover:bg-navy-400 hover:text-white',
                isCollapsed && 'justify-center'
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Section - User Info */}
      <div className="border-t border-navy-400 p-4">
        {!isCollapsed ? (
          <div className="space-y-2">
            <p className="text-xs text-gray-400">Logged in as</p>
            <p className="text-sm font-semibold">{sellerName}</p>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">
              {sellerName.charAt(0)}
            </div>
          </div>
        )}
      </div>

      {/* Help Button */}
      <div className="p-4 border-t border-navy-400">
        <Button
          variant="ghost"
          size={isCollapsed ? 'icon' : 'default'}
          className="w-full text-white hover:bg-navy-400"
        >
          <HelpCircle className="h-5 w-5" />
          {!isCollapsed && <span className="ml-2">Help</span>}
        </Button>
      </div>
    </div>
  )
}