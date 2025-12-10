'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, MessageSquare, Calendar, Flag } from 'lucide-react';
import { SellerDisputeDetailsModal } from './SellerDisputeDetailsModal';

interface SellerDispute {
  id: string;
  seller_id: string;
  dispute_type: string;
  title: string;
  description: string;
  evidence_urls: string[] | null;
  status: string;
  priority: string;
  admin_notes: string | null;
  resolution: string | null;
  resolved_by_admin_id: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SellerDisputesTableProps {
  disputes: SellerDispute[];
}

const DISPUTE_TYPE_LABELS: Record<string, string> = {
  account_suspension: 'Account Suspension',
  product_rejection: 'Product Rejection',
  commission_dispute: 'Commission Dispute',
  payout_delay: 'Payout Delay',
  unfair_review: 'Unfair Review',
  policy_disagreement: 'Policy Disagreement',
  verification_issue: 'Verification Issue',
  other: 'Other',
};

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  open: { color: 'bg-amber-100 text-amber-800 border-amber-300', label: 'Open' },
  under_review: { color: 'bg-blue-100 text-blue-800 border-blue-300', label: 'Under Review' },
  resolved: { color: 'bg-green-100 text-green-800 border-green-300', label: 'Resolved' },
  closed: { color: 'bg-gray-100 text-gray-800 border-gray-300', label: 'Closed' },
};

const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  low: { color: 'bg-blue-100 text-blue-800', label: 'Low' },
  medium: { color: 'bg-yellow-100 text-yellow-800', label: 'Medium' },
  high: { color: 'bg-orange-100 text-orange-800', label: 'High' },
  urgent: { color: 'bg-red-100 text-red-800', label: 'Urgent' },
};

export function SellerDisputesTable({ disputes }: SellerDisputesTableProps) {
  const [selectedDispute, setSelectedDispute] = useState<SellerDispute | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filterDisputes = (status: string) => {
    if (status === 'all') return disputes;
    if (status === 'active') return disputes.filter(d => d.status === 'open' || d.status === 'under_review');
    return disputes.filter(d => d.status === status);
  };

  const filteredDisputes = filterDisputes(activeTab);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Your Disputes with Platform</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">
                All ({disputes.length})
              </TabsTrigger>
              <TabsTrigger value="active">
                Active ({disputes.filter(d => d.status === 'open' || d.status === 'under_review').length})
              </TabsTrigger>
              <TabsTrigger value="resolved">
                Resolved ({disputes.filter(d => d.status === 'resolved').length})
              </TabsTrigger>
            </TabsList>

            {['all', 'active', 'resolved'].map(tab => (
              <TabsContent key={tab} value={tab} className="space-y-4">
                {filteredDisputes.length === 0 ? (
                  <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                    <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">
                      No {tab !== 'all' ? tab : ''} disputes found
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Create a dispute if you have concerns about platform actions
                    </p>
                  </div>
                ) : (
                  filteredDisputes.map(dispute => (
                    <Card key={dispute.id} className="hover:shadow-md transition-shadow border-2">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                            <Flag className="h-6 w-6 text-orange-600" />
                          </div>

                          {/* Dispute Details */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="font-semibold text-lg text-gray-900">
                                  {dispute.title}
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                  {DISPUTE_TYPE_LABELS[dispute.dispute_type] || dispute.dispute_type}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge className={`${STATUS_CONFIG[dispute.status]?.color} border font-medium`}>
                                  {STATUS_CONFIG[dispute.status]?.label}
                                </Badge>
                                <Badge className={PRIORITY_CONFIG[dispute.priority]?.color}>
                                  {PRIORITY_CONFIG[dispute.priority]?.label}
                                </Badge>
                              </div>
                            </div>

                            {/* Description */}
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                              <p className="text-sm text-gray-800 line-clamp-2">
                                {dispute.description}
                              </p>
                            </div>

                            {/* Date */}
                            <div className="flex items-center gap-6 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>Created {formatDate(dispute.created_at)}</span>
                              </div>
                              {dispute.resolved_at && (
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  <span>Resolved {formatDate(dispute.resolved_at)}</span>
                                </div>
                              )}
                            </div>

                            {/* Resolution (if resolved) */}
                            {dispute.status === 'resolved' && dispute.resolution && (
                              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-sm font-semibold text-green-900">Admin Resolution:</p>
                                <p className="text-sm text-green-700 mt-1">{dispute.resolution}</p>
                              </div>
                            )}
                          </div>

                          {/* Action Button */}
                          <div className="flex-shrink-0">
                            <Button
                              onClick={() => setSelectedDispute(dispute)}
                              className="bg-[#1DA1F2] hover:bg-[#1a8cd8]"
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Dispute Details Modal */}
      {selectedDispute && (
        <SellerDisputeDetailsModal
          dispute={selectedDispute}
          onClose={() => setSelectedDispute(null)}
        />
      )}
    </>
  );
}