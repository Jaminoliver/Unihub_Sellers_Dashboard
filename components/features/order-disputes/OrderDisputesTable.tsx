'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Package, Calendar, User, ChevronDown, ChevronUp } from 'lucide-react';

interface Dispute {
  id: string;
  order_id: string;
  dispute_reason: string;
  description: string;
  status: string;
  priority: string;
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
  order: {
    order_number: string;
    total_amount: number;
    product: {
      name: string;
      image_urls?: string[];
    };
    buyer: {
      full_name: string;
      email: string;
    };
  };
}

interface OrderDisputesTableProps {
  disputes: Dispute[];
}

const REASON_LABELS: Record<string, string> = {
  product_not_received: 'Product Not Received',
  damaged_item: 'Damaged Item',
  wrong_item_received: 'Wrong Item',
  fake_counterfeit: 'Fake/Counterfeit',
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
  high: { color: 'bg-red-100 text-red-800', label: 'High' },
};

export function OrderDisputesTable({ disputes }: OrderDisputesTableProps) {
  const [expandedDispute, setExpandedDispute] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;
  
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
    return disputes.filter(d => d.status === status);
  };

  const filteredDisputes = filterDisputes(activeTab);

  const toggleExpand = (disputeId: string) => {
    setExpandedDispute(expandedDispute === disputeId ? null : disputeId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Disputes (Buyer Complaints)</CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          View buyer complaints about your orders. Admin will handle all communication.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">
              All ({disputes.length})
            </TabsTrigger>
            <TabsTrigger value="open">
              Open ({disputes.filter(d => d.status === 'open').length})
            </TabsTrigger>
            <TabsTrigger value="under_review">
              Under Review ({disputes.filter(d => d.status === 'under_review').length})
            </TabsTrigger>
            <TabsTrigger value="resolved">
              Resolved ({disputes.filter(d => d.status === 'resolved').length})
            </TabsTrigger>
          </TabsList>

          {['all', 'open', 'under_review', 'resolved'].map(tab => (
            <TabsContent key={tab} value={tab} className="space-y-4">
              {filteredDisputes.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                  <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">
                    No {tab !== 'all' ? tab : ''} order disputes found
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Buyers raise disputes when they have issues with orders
                  </p>
                </div>
              ) : (
                filteredDisputes.map(dispute => (
                  <Card key={dispute.id} className="hover:shadow-md transition-shadow border-2">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        {/* Product Image */}
                        {dispute.order.product.image_urls?.[0] && (
                          <div className="h-20 w-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            <img 
                              src={dispute.order.product.image_urls[0]} 
                              alt={dispute.order.product.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}

                        {/* Dispute Details */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-lg text-gray-900">
                                {dispute.order.product.name}
                              </h3>
                              <p className="text-sm text-gray-500 mt-1">
                                Order #{dispute.order.order_number}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge className={`${STATUS_CONFIG[dispute.status]?.color} border font-medium`}>
                                {STATUS_CONFIG[dispute.status]?.label}
                              </Badge>
                              <Badge className={PRIORITY_CONFIG[dispute.priority]?.color}>
                                {PRIORITY_CONFIG[dispute.priority]?.label} Priority
                              </Badge>
                            </div>
                          </div>

                          {/* Reason & Description */}
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                            <p className="text-sm font-semibold text-red-900">
                              ⚠️ {REASON_LABELS[dispute.dispute_reason] || dispute.dispute_reason}
                            </p>
                            <p className="text-sm text-red-700 mt-1">{dispute.description}</p>
                          </div>

                          {/* Buyer Info & Date */}
                          <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>{dispute.order.buyer.full_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(dispute.created_at)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              <span>{formatCurrency(dispute.order.total_amount)}</span>
                            </div>
                          </div>

                          {/* Admin Notice */}
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                            <p className="text-sm text-blue-900">
                              💬 <span className="font-semibold">Admin is handling this dispute.</span> They will communicate with both you and the buyer separately to resolve the issue.
                            </p>
                          </div>

                          {/* Resolution (if resolved) */}
                          {dispute.status === 'resolved' && dispute.resolution && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                              <p className="text-sm font-semibold text-green-900">✓ Resolution:</p>
                              <p className="text-sm text-green-700 mt-1">{dispute.resolution}</p>
                              {dispute.resolved_at && (
                                <p className="text-xs text-green-600 mt-2">
                                  Resolved on {formatDate(dispute.resolved_at)}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Expandable Full Details */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpand(dispute.id)}
                            className="mt-2 text-gray-600 hover:text-gray-900"
                          >
                            {expandedDispute === dispute.id ? (
                              <>
                                <ChevronUp className="h-4 w-4 mr-1" />
                                Hide Details
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4 mr-1" />
                                Show Full Details
                              </>
                            )}
                          </Button>

                          {expandedDispute === dispute.id && (
                            <div className="mt-3 p-4 bg-gray-50 rounded-lg border space-y-2 text-sm">
                              <div>
                                <span className="font-semibold text-gray-700">Buyer Email:</span>
                                <span className="ml-2 text-gray-600">{dispute.order.buyer.email}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-gray-700">Dispute ID:</span>
                                <span className="ml-2 text-gray-600">{dispute.id}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-gray-700">Order ID:</span>
                                <span className="ml-2 text-gray-600">{dispute.order_id}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-gray-700">Created:</span>
                                <span className="ml-2 text-gray-600">{formatDate(dispute.created_at)}</span>
                              </div>
                            </div>
                          )}
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
  );
}