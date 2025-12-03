import React, { useState, useEffect } from 'react';
import { useClub } from '@/components/ClubContext';
import { base44 } from '@/api/base44Client';
import { GlassCard, GlassCardContent, GlassCardHeader } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import {
  CreditCard, Plus, Download, Filter, ArrowUpRight, ArrowDownRight,
  CheckCircle, Clock, AlertCircle, XCircle, Receipt, TrendingUp,
  Users, Calendar, Loader2, ShoppingBag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Payments() {
  const { currentClub, isClubAdmin, user } = useClub();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    member_email: '',
    amount: 0,
    payment_type: 'membership',
    description: '',
    status: 'pending'
  });
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [subscriptionItems, setSubscriptionItems] = useState({
    membership: { selected: true, amount: 150, name: 'Annual Membership' },
    lotto: { selected: false, amount: 10, name: 'Weekly Lotto' },
    dinner: { selected: false, amount: 50, name: 'Annual Dinner Ticket' },
    merchandise: { selected: false, amount: 45, name: 'Club Jersey' }
  });

  useEffect(() => {
    if (currentClub?.id) {
      loadPayments();
    }
  }, [currentClub?.id]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      let query = { club_id: currentClub.id };
      if (!isClubAdmin) {
        query.member_email = user.email;
      }
      const paymentsData = await base44.entities.Payment.filter(query);
      setPayments(paymentsData.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter(payment => {
    if (filterStatus !== 'all' && payment.status !== filterStatus) return false;
    if (filterType !== 'all' && payment.payment_type !== filterType) return false;
    return true;
  });

  const stats = {
    total: payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0),
    pending: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0),
    thisMonth: payments.filter(p => {
      if (p.status !== 'completed') return false;
      const date = new Date(p.paid_date || p.created_date);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).reduce((sum, p) => sum + (p.amount || 0), 0)
  };

  const getStatusConfig = (status) => {
    const configs = {
      completed: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Paid' },
      pending: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Pending' },
      failed: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Failed' },
      cancelled: { icon: XCircle, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Cancelled' },
      refunded: { icon: ArrowDownRight, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Refunded' }
    };
    return configs[status] || configs.pending;
  };

  const getTypeColor = (type) => {
    const colors = {
      membership: 'bg-blue-100 text-blue-700',
      subscription: 'bg-purple-100 text-purple-700',
      lotto: 'bg-green-100 text-green-700',
      event: 'bg-pink-100 text-pink-700',
      merchandise: 'bg-amber-100 text-amber-700',
      donation: 'bg-red-100 text-red-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const calculateSubscriptionTotal = () => {
    return Object.values(subscriptionItems)
      .filter(item => item.selected)
      .reduce((sum, item) => sum + item.amount, 0);
  };

  const handleCreatePayment = async () => {
    setSaving(true);
    try {
      await base44.entities.Payment.create({
        ...createFormData,
        club_id: currentClub.id,
        currency: 'EUR'
      });
      await loadPayments();
      setShowCreateModal(false);
      setCreateFormData({
        member_email: '',
        amount: 0,
        payment_type: 'membership',
        description: '',
        status: 'pending'
      });
    } catch (error) {
      console.error('Error creating payment:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            {isClubAdmin ? 'Finances' : 'My Payments'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isClubAdmin ? 'Manage club payments and subscriptions' : 'View your payment history'}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowSubscriptionModal(true)} className="gap-2">
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">Subscription Bundle</span>
          </Button>
          {isClubAdmin && (
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
            >
              <Plus className="w-4 h-4" />
              Create Payment
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards - Admin Only */}
      {isClubAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GlassCard>
              <GlassCardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Collected</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">€{stats.total.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-green-100">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </GlassCardContent>
            </GlassCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <GlassCard>
              <GlassCardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">This Month</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">€{stats.thisMonth.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-100">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </GlassCardContent>
            </GlassCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GlassCard>
              <GlassCardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Outstanding</p>
                    <p className="text-3xl font-bold text-amber-600 mt-1">€{stats.pending.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-100">
                    <Clock className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </GlassCardContent>
            </GlassCard>
          </motion.div>
        </div>
      )}

      {/* Filters */}
      <GlassCard className="mb-6">
        <GlassCardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="membership">Membership</SelectItem>
                <SelectItem value="subscription">Subscription</SelectItem>
                <SelectItem value="lotto">Lotto</SelectItem>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="merchandise">Merchandise</SelectItem>
                <SelectItem value="donation">Donation</SelectItem>
              </SelectContent>
            </Select>
            {isClubAdmin && (
              <Button variant="outline" className="gap-2 ml-auto">
                <Download className="w-4 h-4" />
                Export
              </Button>
            )}
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Payments List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : filteredPayments.length === 0 ? (
        <GlassCard>
          <GlassCardContent className="p-12 text-center">
            <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No payments found</h3>
            <p className="text-gray-500">
              {isClubAdmin ? 'Payments will appear here once members make transactions' : 'You have no payment history yet'}
            </p>
          </GlassCardContent>
        </GlassCard>
      ) : (
        <GlassCard>
          <GlassCardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {filteredPayments.map((payment, index) => {
                const statusConfig = getStatusConfig(payment.status);
                const StatusIcon = statusConfig.icon;
                return (
                  <motion.div
                    key={payment.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${statusConfig.bg}`}>
                        <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{payment.description || payment.payment_type}</h3>
                          <Badge variant="secondary" className={getTypeColor(payment.payment_type)}>
                            {payment.payment_type}
                          </Badge>
                          {payment.is_recurring && (
                            <Badge variant="outline" className="text-xs">Recurring</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          {isClubAdmin && <span>{payment.member_name || payment.member_email}</span>}
                          <span>{format(parseISO(payment.created_date), 'MMM d, yyyy')}</span>
                          {payment.items?.length > 1 && (
                            <span>{payment.items.length} items bundled</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          €{payment.amount?.toFixed(2)}
                        </p>
                        <Badge 
                          variant="secondary" 
                          className={`${statusConfig.bg} ${statusConfig.color} border-0 mt-1`}
                        >
                          {statusConfig.label}
                        </Badge>
                      </div>
                    </div>
                    {/* Show bundled items if any */}
                    {payment.items?.length > 0 && (
                      <div className="mt-3 ml-16 flex flex-wrap gap-2">
                        {payment.items.map((item, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {item.name}: €{item.total}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Create Payment Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Payment</DialogTitle>
            <DialogDescription>
              Record a new payment for a member
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="member_email">Member Email *</Label>
              <Input
                id="member_email"
                type="email"
                value={createFormData.member_email}
                onChange={(e) => setCreateFormData({...createFormData, member_email: e.target.value})}
                placeholder="member@example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount (€) *</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  value={createFormData.amount}
                  onChange={(e) => setCreateFormData({...createFormData, amount: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label htmlFor="payment_type">Type</Label>
                <Select value={createFormData.payment_type} onValueChange={(v) => setCreateFormData({...createFormData, payment_type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="membership">Membership</SelectItem>
                    <SelectItem value="subscription">Subscription</SelectItem>
                    <SelectItem value="lotto">Lotto</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="merchandise">Merchandise</SelectItem>
                    <SelectItem value="donation">Donation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={createFormData.description}
                onChange={(e) => setCreateFormData({...createFormData, description: e.target.value})}
                placeholder="Payment description"
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={createFormData.status} onValueChange={(v) => setCreateFormData({...createFormData, status: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button 
              onClick={handleCreatePayment}
              disabled={saving || !createFormData.member_email || !createFormData.amount}
              className="bg-gradient-to-r from-blue-500 to-indigo-600"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Create Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscription Stacking Modal */}
      <Dialog open={showSubscriptionModal} onOpenChange={setShowSubscriptionModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Subscription Bundle</DialogTitle>
            <DialogDescription>
              Select multiple items to pay in one monthly direct debit
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {Object.entries(subscriptionItems).map(([key, item]) => (
              <div 
                key={key}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  item.selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSubscriptionItems({
                  ...subscriptionItems,
                  [key]: { ...item, selected: !item.selected }
                })}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={item.selected} />
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500">
                        {key === 'lotto' ? 'Weekly draw entry' : 
                         key === 'membership' ? 'Full club access' :
                         key === 'dinner' ? 'Table for 2' : 'Official club gear'}
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900">€{item.amount}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monthly Payment</p>
                <p className="text-2xl font-bold text-gray-900">
                  €{(calculateSubscriptionTotal() / 12).toFixed(2)}/mo
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-lg font-semibold text-gray-700">€{calculateSubscriptionTotal()}</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubscriptionModal(false)}>Cancel</Button>
            <Button 
              className="bg-gradient-to-r from-blue-500 to-indigo-600"
              disabled={calculateSubscriptionTotal() === 0}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Set Up Direct Debit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}