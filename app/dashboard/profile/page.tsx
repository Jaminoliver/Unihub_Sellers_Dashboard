'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Mail, Phone, Building2, MapPin, Calendar, Shield } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface SellerProfile {
  business_name: string
  business_phone: string
  business_email: string
  business_description: string
  bank_name: string
  account_number: string
  account_name: string
  is_verified: boolean
  created_at: string
  profile: {
    full_name: string
    email: string
    phone_number: string
  }
  university: {
    name: string
    state: string
  }
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<SellerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    business_name: '',
    business_phone: '',
    business_email: '',
    business_description: '',
  })
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('sellers')
        .select(`
          *,
          profile:profiles!sellers_user_id_fkey(full_name, email, phone_number),
          university:universities(name, state)
        `)
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return
      }

      setProfile(data as any)
      setEditForm({
        business_name: data.business_name || '',
        business_phone: data.business_phone || '',
        business_email: data.business_email || '',
        business_description: data.business_description || '',
      })
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('sellers')
        .update({
          business_name: editForm.business_name,
          business_phone: editForm.business_phone,
          business_email: editForm.business_email,
          business_description: editForm.business_description,
        })
        .eq('user_id', user.id)

      if (error) throw error

      await fetchProfile()
      setEditing(false)
    } catch (error) {
      console.error('Error saving:', error)
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Profile not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-500 mt-1">Manage your seller account information</p>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditing(true)}>
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Business Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <>
                <div>
                  <Label>Business Name</Label>
                  <Input
                    value={editForm.business_name}
                    onChange={(e) => setEditForm({ ...editForm, business_name: e.target.value })}
                    placeholder="Your business name"
                  />
                </div>
                <div>
                  <Label>Business Email</Label>
                  <Input
                    type="email"
                    value={editForm.business_email}
                    onChange={(e) => setEditForm({ ...editForm, business_email: e.target.value })}
                    placeholder="business@example.com"
                  />
                </div>
                <div>
                  <Label>Business Phone</Label>
                  <Input
                    value={editForm.business_phone}
                    onChange={(e) => setEditForm({ ...editForm, business_phone: e.target.value })}
                    placeholder="+234 XXX XXX XXXX"
                  />
                </div>
                <div>
                  <Label>Business Description</Label>
                  <Textarea
                    value={editForm.business_description}
                    onChange={(e) => setEditForm({ ...editForm, business_description: e.target.value })}
                    placeholder="Tell buyers about your business..."
                    rows={4}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Business Name</p>
                    <p className="font-medium">{profile.business_name || 'Not set'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Business Email</p>
                    <p className="font-medium">{profile.business_email || 'Not set'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Business Phone</p>
                    <p className="font-medium">{profile.business_phone || 'Not set'}</p>
                  </div>
                </div>
                {profile.business_description && (
                  <div className="flex items-start gap-3">
                    <div className="w-5"></div>
                    <div>
                      <p className="text-sm text-gray-500">Description</p>
                      <p className="text-sm text-gray-700">{profile.business_description}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="font-medium">{(profile.profile as any)?.full_name || 'Not set'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{(profile.profile as any)?.email || 'Not set'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{(profile.profile as any)?.phone_number || 'Not set'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-medium">
                  {(profile.university as any)?.name || 'Not set'}
                  {(profile.university as any)?.state && `, ${(profile.university as any).state}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bank Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Bank Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-5"></div>
              <div>
                <p className="text-sm text-gray-500">Bank Name</p>
                <p className="font-medium">{profile.bank_name || 'Not set'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5"></div>
              <div>
                <p className="text-sm text-gray-500">Account Number</p>
                <p className="font-medium">{profile.account_number || 'Not set'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5"></div>
              <div>
                <p className="text-sm text-gray-500">Account Name</p>
                <p className="font-medium">{profile.account_name || 'Not set'}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => router.push('/dashboard/settings')}
            >
              Update Bank Details
            </Button>
          </CardContent>
        </Card>

        {/* Account Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Verification Status</span>
              <Badge variant={profile.is_verified ? "default" : "secondary"}>
                {profile.is_verified ? 'Verified' : 'Unverified'}
              </Badge>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Member Since</p>
                <p className="font-medium">
                  {new Date(profile.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
            {!profile.is_verified && (
              <Button 
                variant="default" 
                className="w-full"
                onClick={() => router.push('/dashboard/account/verification')}
              >
                Complete Verification
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DollarSign({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="12" y1="1" x2="12" y2="23"></line>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
    </svg>
  )
}