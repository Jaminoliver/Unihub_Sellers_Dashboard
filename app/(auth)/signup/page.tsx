'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function SignUpPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [states, setStates] = useState<any[]>([])
  const [universities, setUniversities] = useState<any[]>([])
  const [formData, setFormData] = useState({
    fullName: '',
    businessName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    state: '',
    universityId: '',
    pickupAddress: '',
  })

  // Fetch states on mount
  useEffect(() => {
    const fetchStates = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('states')
        .select('*')
        .eq('is_active', true)
        .order('name')
      
      if (data) setStates(data)
    }
    fetchStates()
  }, [])

  // Fetch universities when state changes - filter by selected state NAME
  useEffect(() => {
    if (!formData.state) {
      setUniversities([])
      setFormData(prev => ({ ...prev, universityId: '' }))
      return
    }

    const fetchUniversities = async () => {
      const supabase = createClient()
      
      // Find the state name from the selected state ID
      const selectedState = states.find(s => s.id === formData.state)
      if (!selectedState) return

      // Fetch universities where state column matches the state NAME
      const { data } = await supabase
        .from('universities')
        .select('*')
        .eq('state', selectedState.name)
        .eq('is_active', true)
        .order('name')
      
      if (data) {
        setUniversities(data)
      }
    }
    fetchUniversities()
  }, [formData.state, states])

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsLoading(true)
  setError(null)

  // Validation
  if (formData.password !== formData.confirmPassword) {
    setError('Passwords do not match')
    setIsLoading(false)
    return
  }

  if (formData.password.length < 6) {
    setError('Password must be at least 6 characters')
    setIsLoading(false)
    return
  }

  try {
    const supabase = createClient()
    
    // 1. Sign up the user with auto-confirm in options
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.fullName,
        }
      }
    })

    if (authError) {
      console.error('Auth error:', authError)
      setError(authError.message)
      return
    }

    if (!authData.user) {
      setError('Failed to create account')
      return
    }

    // Get state name for seller record
    const selectedState = states.find(s => s.id === formData.state)

    // 2. Create seller profile with detailed error logging
    const { data: sellerData, error: sellerError } = await supabase
      .from('sellers')
      .insert({
        user_id: authData.user.id,
        full_name: formData.fullName,
        business_name: formData.businessName,
        email: formData.email,
        phone_number: formData.phoneNumber,
        state: selectedState?.name || '',
        university_id: formData.universityId,
        pickup_address: formData.pickupAddress,
      })
      .select()

    if (sellerError) {
      console.error('Seller creation detailed error:', {
        message: sellerError.message,
        details: sellerError.details,
        hint: sellerError.hint,
        code: sellerError.code,
        full_error: sellerError
      })
      setError(`Failed to create seller profile: ${sellerError.message || 'Please contact support.'}`)
      return
    }

    console.log('Seller created successfully:', sellerData)

    // Success! Redirect to dashboard
    router.push('/dashboard')
    router.refresh()
  } catch (err: any) {
    console.error('Unexpected error:', err)
    setError(err?.message || 'An unexpected error occurred. Please try again.')
  } finally {
    setIsLoading(false)
  }
}

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy-600 via-navy-500 to-navy-700 p-4 py-8">
      <Card className="w-full max-w-3xl my-8 shadow-2xl">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <span className="text-4xl font-bold text-white">U</span>
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900">Become a UniHub Seller</CardTitle>
          <CardDescription className="text-base">
            Create your seller account to start selling on campus
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5 pb-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                {error}
              </div>
            )}

            {/* Personal Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-base font-medium">Full Name *</Label>
                <Input
                  id="fullName"
                  placeholder="John Adebayo"
                  required
                  className="h-11"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessName" className="text-base font-medium">Business Name *</Label>
                <Input
                  id="businessName"
                  placeholder="BrightBooks NG"
                  required
                  className="h-11"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-medium">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@brightbooks.ng"
                  required
                  className="h-11"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-base font-medium">Phone Number *</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="+234 801 234 5678"
                  required
                  className="h-11"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Location - State First, Then University */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="state" className="text-base font-medium">State *</Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) => setFormData({ ...formData, state: value, universityId: '' })}
                  disabled={isLoading}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select your state first" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((state) => (
                      <SelectItem key={state.id} value={state.id}>
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="university" className="text-base font-medium">University *</Label>
                <Select
                  value={formData.universityId}
                  onValueChange={(value) => setFormData({ ...formData, universityId: value })}
                  disabled={isLoading || !formData.state || universities.length === 0}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue 
                      placeholder={
                        !formData.state 
                          ? "Select state first" 
                          : universities.length === 0 
                          ? "Loading universities..." 
                          : "Select university"
                      } 
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {universities.map((uni) => (
                      <SelectItem key={uni.id} value={uni.id}>
                        {uni.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.state && universities.length > 0 && (
                  <p className="text-xs text-gray-500">{universities.length} universities found in {states.find(s => s.id === formData.state)?.name}</p>
                )}
              </div>
            </div>

            {/* Pickup Address */}
            <div className="space-y-2">
              <Label htmlFor="pickupAddress" className="text-base font-medium">Pickup Address *</Label>
              <Input
                id="pickupAddress"
                placeholder="e.g., Room 5, Block A, Jaja Hall"
                required
                className="h-11"
                value={formData.pickupAddress}
                onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
                disabled={isLoading}
              />
            </div>

            {/* Password Section - More Spacing */}
            <div className="pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-base font-medium">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimum 6 characters"
                      required
                      className="h-11 pr-10"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-base font-medium">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    required
                    className="h-11"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pt-6 pb-6">
            <Button
              type="submit"
              className="w-full h-12 bg-primary hover:bg-primary-600 text-white font-semibold text-base shadow-md"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Seller Account'
              )}
            </Button>

            <div className="text-center text-sm text-gray-600 pt-2">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-primary hover:text-primary-600 hover:underline">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}