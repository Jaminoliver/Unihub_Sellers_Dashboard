import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, ShoppingCart, Package, TrendingUp } from 'lucide-react'

export default function DashboardPage() {
  const stats = [
    {
      title: 'Total Revenue',
      value: '₦258,000',
      change: '+15.3%',
      icon: DollarSign,
      positive: true,
    },
    {
      title: 'Active Orders',
      value: '5',
      change: '+2 from yesterday',
      icon: ShoppingCart,
      positive: true,
    },
    {
      title: 'Total Products',
      value: '24',
      change: '+3 this week',
      icon: Package,
      positive: true,
    },
    {
      title: 'Conversion Rate',
      value: '3.8%',
      change: '+0.5%',
      icon: TrendingUp,
      positive: true,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back! Here's your business overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <Icon className="h-5 w-5 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className={`text-xs mt-1 ${stat.positive ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Sales Overview Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
            <p className="text-gray-400">Chart will go here</p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between border-b pb-4 last:border-0">
                <div>
                  <p className="font-medium">Order #ORD-102{i}</p>
                  <p className="text-sm text-gray-500">Chinedu Okafor • UNILAG</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">₦15,000</p>
                  <p className="text-sm text-yellow-600">Pending</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}