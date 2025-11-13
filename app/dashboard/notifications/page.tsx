// app/dashboard/notifications/page.tsx
'use client'

import { Bell, Package, CreditCard, TrendingUp, Check, Filter } from 'lucide-react'
import { useNotifications } from '@/hooks/use-notifications'
import { formatDistanceToNow } from 'date-fns'
import { Card } from '@/components/ui/card'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function NotificationsPage() {
  const [userId, setUserId] = useState<string>()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
    }
    getUser()
  }, [])

  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications(userId)

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.is_read)
    : notifications

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order_placed':
        return <Package className="h-6 w-6 text-blue-600" />
      case 'payment_escrow':
        return <CreditCard className="h-6 w-6 text-yellow-600" />
      case 'order_delivered':
        return <Check className="h-6 w-6 text-green-600" />
      case 'escrow_released':
      case 'wallet_credited':
        return <TrendingUp className="h-6 w-6 text-emerald-600" />
      default:
        return <Bell className="h-6 w-6 text-gray-600" />
    }
  }

  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case 'order_placed':
        return 'bg-blue-50 border-blue-100'
      case 'payment_escrow':
        return 'bg-yellow-50 border-yellow-100'
      case 'order_delivered':
        return 'bg-green-50 border-green-100'
      case 'escrow_released':
      case 'wallet_credited':
        return 'bg-emerald-50 border-emerald-100'
      default:
        return 'bg-gray-50 border-gray-100'
    }
  }

  const handleNotificationClick = async (notification: any) => {
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }
    
    if (notification.order_number) {
      router.push(`/dashboard/orders?search=${notification.order_number}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter */}
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === 'all'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === 'unread'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>

          {/* Mark all as read */}
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-gray-500">
            <Bell className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p className="text-sm">
              {filter === 'unread' 
                ? 'You\'re all caught up!' 
                : 'When you receive notifications, they\'ll appear here'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`p-6 cursor-pointer hover:shadow-md transition-all ${
                !notification.is_read ? 'border-l-4 border-l-blue-600' : ''
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`flex-shrink-0 p-3 rounded-lg ${getNotificationBgColor(notification.type)}`}>
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {notification.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-3">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-500">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                        {notification.order_number && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                            {notification.order_number}
                          </span>
                        )}
                        {notification.amount && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                            ₦{parseFloat(notification.amount).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Unread indicator */}
                    {!notification.is_read && (
                      <div className="flex-shrink-0">
                        <span className="flex h-3 w-3 bg-blue-600 rounded-full"></span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}