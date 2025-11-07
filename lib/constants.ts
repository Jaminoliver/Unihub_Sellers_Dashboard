export const PRODUCT_CONDITIONS = [
  { value: 'new', label: 'Brand New' },
  { value: 'used', label: 'Used' },
] as const

export const ORDER_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  READY: 'ready',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const

export const ORDER_STATUS_LABELS = {
  pending: { label: 'Pending', color: 'bg-yellow-500' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-500' },
  ready: { label: 'Ready for Pickup', color: 'bg-purple-500' },
  delivered: { label: 'Delivered', color: 'bg-green-500' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500' },
} as const

export const PAYMENT_METHODS = [
  { value: 'full', label: 'Full Payment' },
  { value: 'half', label: 'Half Payment' },
  { value: 'pod', label: 'Pay on Delivery' },
] as const

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
export const MAX_IMAGES_PER_PRODUCT = 5
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export const NIGERIAN_BANKS = [
  'Access Bank',
  'Citibank',
  'Ecobank',
  'Fidelity Bank',
  'First Bank of Nigeria',
  'First City Monument Bank (FCMB)',
  'Guaranty Trust Bank (GTBank)',
  'Heritage Bank',
  'Keystone Bank',
  'Polaris Bank',
  'Providus Bank',
  'Stanbic IBTC Bank',
  'Standard Chartered Bank',
  'Sterling Bank',
  'Union Bank',
  'United Bank for Africa (UBA)',
  'Unity Bank',
  'Wema Bank',
  'Zenith Bank',
] as const