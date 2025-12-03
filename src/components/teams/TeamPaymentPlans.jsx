import React, { useState, useEffect } from 'react';
import { useClub } from '@/components/ClubContext';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import {
  CreditCard, Plus, Check, Clock, AlertCircle, Send, Loader2,
  Users, Calendar, Trash2, Edit2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard';
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

export default function TeamPaymentPlans({ team, members }) {
  const { currentClub } = useClub();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    amount: 0,
    payment_type: 'one_time',
    due_date: '',
    description: ''
  });

  useEffect(() => {
    loadPlans();
  }, [team.id]);

  const loadPlans = async () => {
    try {
      const data = await base44.entities.GroupPaymentPlan.filter({ 
        club_id: currentClub.id,
        team_id: team.id 
      });
      setPlans(data);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async () => {
    setSaving(true);
    try {
      // Create plan with all team members assigned
      const assignedMembers = members.map(m => ({
        member_id: m.id,
        member_name: `${m.first_name} ${m.last_name}`,
        member_email: m.email,
        status: 'pending',
        amount_paid: 0,
        payment_ids: [],
        assigned_date: new Date().toISOString().split('T')[0]
      }));

      await base44.entities.GroupPaymentPlan.create({
        ...formData,
        club_id: currentClub.id,
        team_id: team.id,
        team_name: team.name,
        status: 'active',
        assigned_members: assignedMembers,
        total_collected: 0
      });

      await loadPlans();
      setShowCreateModal(false);
      setFormData({ name: '', amount: 0, payment_type: 'one_time', due_date: '', description: '' });
    } catch (error) {
      console.error('Error creating plan:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (plan, memberId) => {
    try {
      const updatedMembers = plan.assigned_members.map(m => {
        if (m.member_id === memberId) {
          return { ...m, status: 'paid', amount_paid: plan.amount };
        }
        return m;
      });
      
      const totalCollected = updatedMembers
        .filter(m => m.status === 'paid')
        .reduce((sum, m) => sum + (m.amount_paid || 0), 0);

      await base44.entities.GroupPaymentPlan.update(plan.id, {
        assigned_members: updatedMembers,
        total_collected: totalCollected
      });
      await loadPlans();
    } catch (error) {
      console.error('Error marking paid:', error);
    }
  };

  const sendReminder = async (plan, member) => {
    try {
      await base44.integrations.Core.SendEmail({
        to: member.member_email,
        subject: `Payment Reminder: ${plan.name}`,
        body: `Hi ${member.member_name.split(' ')[0]},\n\nThis is a reminder about your payment of €${plan.amount} for "${plan.name}" (${team.name}).\n\n${plan.due_date ? `Due date: ${format(parseISO(plan.due_date), 'MMM d, yyyy')}` : ''}\n\nPlease contact the club to arrange payment.\n\nThank you!`
      });
      alert('Reminder sent!');
    } catch (error) {
      console.error('Error sending reminder:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      paid: 'bg-green-100 text-green-700',
      pending: 'bg-amber-100 text-amber-700',
      overdue: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const calculateProgress = (plan) => {
    if (!plan.assigned_members?.length) return 0;
    const paid = plan.assigned_members.filter(m => m.status === 'paid').length;
    return Math.round((paid / plan.assigned_members.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Payment Plans</h3>
          <p className="text-sm text-gray-500">Manage fees for {team.name}</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Create Plan
        </Button>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <CreditCard className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>No payment plans for this team</p>
          <Button variant="link" onClick={() => setShowCreateModal(true)}>Create a plan</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => {
            const progress = calculateProgress(plan);
            const paidCount = plan.assigned_members?.filter(m => m.status === 'paid').length || 0;
            const totalCount = plan.assigned_members?.length || 0;

            return (
              <GlassCard key={plan.id}>
                <GlassCardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="font-medium text-gray-900">€{plan.amount}</span>
                        {plan.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Due: {format(parseISO(plan.due_date), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className={plan.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                      {plan.status}
                    </Badge>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-500">{paidCount} of {totalCount} paid</span>
                      <span className="font-medium">€{plan.total_collected || 0}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {plan.assigned_members?.map((member) => (
                      <div key={member.member_id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{member.member_name}</span>
                          <Badge variant="secondary" className={`text-xs ${getStatusColor(member.status)}`}>
                            {member.status}
                          </Badge>
                        </div>
                        {member.status === 'pending' && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => sendReminder(plan, member)}>
                              <Send className="w-3 h-3 mr-1" />
                              Remind
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-green-600" onClick={() => handleMarkPaid(plan, member.member_id)}>
                              <Check className="w-3 h-3 mr-1" />
                              Paid
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </GlassCardContent>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Create Plan Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Payment Plan for {team.name}</DialogTitle>
            <DialogDescription>
              All {members.length} team members will be assigned to this plan
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Plan Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Season Registration Fee"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount (€) *</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label>Payment Type</Label>
                <Select value={formData.payment_type} onValueChange={(v) => setFormData({...formData, payment_type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One-time</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({...formData, due_date: e.target.value})}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreatePlan} disabled={saving || !formData.name || !formData.amount}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}