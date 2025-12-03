import React, { useState, useEffect } from 'react';
import { useClub } from '@/components/ClubContext';
import { base44 } from '@/api/base44Client';
import { GlassCard, GlassCardContent, GlassCardHeader } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';
import { format, parseISO, isPast, isBefore } from 'date-fns';
import {
  CreditCard, Plus, Users, Calendar, Check, AlertCircle,
  Clock, Loader2, Edit2, Trash2, UserPlus, Send, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
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

export default function GroupPaymentPlansManager({ onClose }) {
  const { currentClub, isClubAdmin } = useClub();
  const [plans, setPlans] = useState([]);
  const [teams, setTeams] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    team_id: '',
    amount: 0,
    payment_type: 'one_time',
    due_date: '',
    season: '',
    includes: [],
    early_bird_discount: { enabled: false, amount: 0, deadline: '' },
    installments: { enabled: false, count: 3, frequency: 'monthly' }
  });
  const [newInclude, setNewInclude] = useState('');

  useEffect(() => {
    if (currentClub?.id) {
      loadData();
    }
  }, [currentClub?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansData, teamsData, membersData] = await Promise.all([
        base44.entities.GroupPaymentPlan.filter({ club_id: currentClub.id }),
        base44.entities.Team.filter({ club_id: currentClub.id, is_active: true }),
        base44.entities.Member.filter({ club_id: currentClub.id, status: 'active' })
      ]);
      setPlans(plansData);
      setTeams(teamsData);
      setMembers(membersData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async () => {
    setSaving(true);
    try {
      const team = teams.find(t => t.id === formData.team_id);
      const planData = {
        ...formData,
        club_id: currentClub.id,
        team_name: team?.name,
        status: 'active',
        assigned_members: selectedPlan?.assigned_members || []
      };

      if (selectedPlan) {
        await base44.entities.GroupPaymentPlan.update(selectedPlan.id, planData);
      } else {
        await base44.entities.GroupPaymentPlan.create(planData);
      }

      await loadData();
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving plan:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAssignMembers = async () => {
    if (!selectedPlan) return;
    setSaving(true);
    try {
      const existingIds = (selectedPlan.assigned_members || []).map(m => m.member_id);
      const newAssignments = selectedMembers
        .filter(id => !existingIds.includes(id))
        .map(memberId => {
          const member = members.find(m => m.id === memberId);
          return {
            member_id: memberId,
            member_name: `${member.first_name} ${member.last_name}`,
            member_email: member.email,
            status: 'pending',
            amount_paid: 0,
            payment_ids: [],
            assigned_date: new Date().toISOString().split('T')[0]
          };
        });

      const updatedMembers = [...(selectedPlan.assigned_members || []), ...newAssignments];
      
      await base44.entities.GroupPaymentPlan.update(selectedPlan.id, {
        assigned_members: updatedMembers
      });

      await loadData();
      setShowAssignModal(false);
      setSelectedMembers([]);
    } catch (error) {
      console.error('Error assigning members:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (plan, memberId) => {
    try {
      const updatedMembers = plan.assigned_members.filter(m => m.member_id !== memberId);
      await base44.entities.GroupPaymentPlan.update(plan.id, {
        assigned_members: updatedMembers
      });
      await loadData();
    } catch (error) {
      console.error('Error removing member:', error);
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
      await loadData();
    } catch (error) {
      console.error('Error marking paid:', error);
    }
  };

  const sendPaymentReminder = async (plan, member) => {
    try {
      await base44.integrations.Core.SendEmail({
        to: member.member_email,
        subject: `Payment Reminder: ${plan.name}`,
        body: `Hi ${member.member_name.split(' ')[0]},\n\nThis is a reminder that your payment of €${plan.amount} for "${plan.name}" is due${plan.due_date ? ` by ${format(parseISO(plan.due_date), 'MMM d, yyyy')}` : ''}.\n\nPlease contact the club to arrange payment.\n\nThank you!`
      });
      alert('Reminder sent!');
    } catch (error) {
      console.error('Error sending reminder:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      team_id: '',
      amount: 0,
      payment_type: 'one_time',
      due_date: '',
      season: '',
      includes: [],
      early_bird_discount: { enabled: false, amount: 0, deadline: '' },
      installments: { enabled: false, count: 3, frequency: 'monthly' }
    });
    setSelectedPlan(null);
    setNewInclude('');
  };

  const openEditModal = (plan) => {
    setSelectedPlan(plan);
    setFormData({
      name: plan.name || '',
      description: plan.description || '',
      team_id: plan.team_id || '',
      amount: plan.amount || 0,
      payment_type: plan.payment_type || 'one_time',
      due_date: plan.due_date || '',
      season: plan.season || '',
      includes: plan.includes || [],
      early_bird_discount: plan.early_bird_discount || { enabled: false, amount: 0, deadline: '' },
      installments: plan.installments || { enabled: false, count: 3, frequency: 'monthly' }
    });
    setShowCreateModal(true);
  };

  const openAssignModal = (plan) => {
    setSelectedPlan(plan);
    const existingIds = (plan.assigned_members || []).map(m => m.member_id);
    setSelectedMembers([]);
    setShowAssignModal(true);
  };

  const addInclude = () => {
    if (newInclude.trim()) {
      setFormData({
        ...formData,
        includes: [...formData.includes, newInclude.trim()]
      });
      setNewInclude('');
    }
  };

  const getTeamMembers = (teamId) => {
    if (!teamId) return members;
    return members.filter(m => m.teams?.includes(teamId));
  };

  const getStatusColor = (status) => {
    const colors = {
      paid: 'bg-green-100 text-green-700',
      pending: 'bg-amber-100 text-amber-700',
      partial: 'bg-blue-100 text-blue-700',
      overdue: 'bg-red-100 text-red-700',
      waived: 'bg-gray-100 text-gray-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const calculateProgress = (plan) => {
    if (!plan.assigned_members?.length) return 0;
    const paid = plan.assigned_members.filter(m => m.status === 'paid').length;
    return Math.round((paid / plan.assigned_members.length) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Group Payment Plans</h3>
          <p className="text-sm text-gray-500">Create payment plans per team/group</p>
        </div>
        {isClubAdmin && (
          <Button onClick={() => { resetForm(); setShowCreateModal(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Plan
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <CreditCard className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>No payment plans created yet</p>
          <Button variant="link" onClick={() => setShowCreateModal(true)}>Create your first plan</Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {plans.map((plan, index) => {
            const progress = calculateProgress(plan);
            const paidCount = plan.assigned_members?.filter(m => m.status === 'paid').length || 0;
            const totalCount = plan.assigned_members?.length || 0;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <GlassCard>
                  <GlassCardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                          {plan.team_name && (
                            <Badge variant="outline">{plan.team_name}</Badge>
                          )}
                          <Badge variant="secondary" className={plan.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                            {plan.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span className="font-medium text-gray-900">€{plan.amount}</span>
                          <span className="capitalize">{plan.payment_type?.replace('_', ' ')}</span>
                          {plan.due_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              Due: {format(parseISO(plan.due_date), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openAssignModal(plan)}>
                          <UserPlus className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditModal(plan)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-500">{paidCount} of {totalCount} paid</span>
                        <span className="font-medium text-gray-900">€{plan.total_collected || 0} collected</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    {/* Assigned Members */}
                    {plan.assigned_members?.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">Assigned Members</p>
                        <div className="max-h-48 overflow-y-auto space-y-2">
                          {plan.assigned_members.map((member) => (
                            <div key={member.member_id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <span className="font-medium text-gray-900 text-sm">{member.member_name}</span>
                                <Badge variant="secondary" className={`text-xs ${getStatusColor(member.status)}`}>
                                  {member.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1">
                                {member.status === 'pending' && (
                                  <>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="h-7 text-xs"
                                      onClick={() => sendPaymentReminder(plan, member)}
                                    >
                                      <Send className="w-3 h-3 mr-1" />
                                      Remind
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="h-7 text-xs text-green-600"
                                      onClick={() => handleMarkPaid(plan, member.member_id)}
                                    >
                                      <Check className="w-3 h-3 mr-1" />
                                      Paid
                                    </Button>
                                  </>
                                )}
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-7 w-7 p-0 text-red-500"
                                  onClick={() => handleRemoveMember(plan, member.member_id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </GlassCardContent>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Plan Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPlan ? 'Edit Payment Plan' : 'Create Payment Plan'}</DialogTitle>
            <DialogDescription>
              Set up a payment plan for a team or group
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Plan Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., U14 Season 2024 Membership"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="team_id">Team/Group</Label>
                <Select value={formData.team_id} onValueChange={(v) => setFormData({...formData, team_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>All Members</SelectItem>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="season">Season</Label>
                <Input
                  id="season"
                  value={formData.season}
                  onChange={(e) => setFormData({...formData, season: e.target.value})}
                  placeholder="e.g., 2024/25"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount (€) *</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label htmlFor="payment_type">Payment Type</Label>
                <Select value={formData.payment_type} onValueChange={(v) => setFormData({...formData, payment_type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One-time</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({...formData, due_date: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="What this plan covers..."
                rows={2}
              />
            </div>

            {/* Early Bird */}
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center justify-between mb-3">
                <Label className="font-medium text-green-800">Early Bird Discount</Label>
                <Switch
                  checked={formData.early_bird_discount.enabled}
                  onCheckedChange={(v) => setFormData({
                    ...formData, 
                    early_bird_discount: {...formData.early_bird_discount, enabled: v}
                  })}
                />
              </div>
              {formData.early_bird_discount.enabled && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Discount (€)</Label>
                    <Input
                      type="number"
                      value={formData.early_bird_discount.amount}
                      onChange={(e) => setFormData({
                        ...formData,
                        early_bird_discount: {...formData.early_bird_discount, amount: parseFloat(e.target.value) || 0}
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Deadline</Label>
                    <Input
                      type="date"
                      value={formData.early_bird_discount.deadline}
                      onChange={(e) => setFormData({
                        ...formData,
                        early_bird_discount: {...formData.early_bird_discount, deadline: e.target.value}
                      })}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Installments */}
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <Label className="font-medium text-blue-800">Allow Installments</Label>
                <Switch
                  checked={formData.installments.enabled}
                  onCheckedChange={(v) => setFormData({
                    ...formData, 
                    installments: {...formData.installments, enabled: v}
                  })}
                />
              </div>
              {formData.installments.enabled && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Number of Payments</Label>
                    <Select 
                      value={formData.installments.count.toString()} 
                      onValueChange={(v) => setFormData({
                        ...formData,
                        installments: {...formData.installments, count: parseInt(v)}
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 payments</SelectItem>
                        <SelectItem value="3">3 payments</SelectItem>
                        <SelectItem value="4">4 payments</SelectItem>
                        <SelectItem value="6">6 payments</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Frequency</Label>
                    <Select 
                      value={formData.installments.frequency} 
                      onValueChange={(v) => setFormData({
                        ...formData,
                        installments: {...formData.installments, frequency: v}
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* What's Included */}
            <div>
              <Label>What's Included</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newInclude}
                  onChange={(e) => setNewInclude(e.target.value)}
                  placeholder="Add item..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInclude())}
                />
                <Button type="button" variant="outline" onClick={addInclude}>Add</Button>
              </div>
              {formData.includes.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.includes.map((item, index) => (
                    <Badge key={index} variant="secondary" className="pr-1">
                      {item}
                      <button
                        onClick={() => setFormData({
                          ...formData,
                          includes: formData.includes.filter((_, i) => i !== index)
                        })}
                        className="ml-2 hover:text-red-500"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button 
              onClick={handleSavePlan} 
              disabled={saving || !formData.name || !formData.amount}
              className="bg-gradient-to-r from-blue-500 to-indigo-600"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {selectedPlan ? 'Update Plan' : 'Create Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Members Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Members to Plan</DialogTitle>
            <DialogDescription>
              Select members to add to "{selectedPlan?.name}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {getTeamMembers(selectedPlan?.team_id).map((member) => {
              const isAlreadyAssigned = selectedPlan?.assigned_members?.some(m => m.member_id === member.id);
              if (isAlreadyAssigned) return null;
              
              return (
                <div 
                  key={member.id} 
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                  onClick={() => {
                    if (selectedMembers.includes(member.id)) {
                      setSelectedMembers(selectedMembers.filter(id => id !== member.id));
                    } else {
                      setSelectedMembers([...selectedMembers, member.id]);
                    }
                  }}
                >
                  <Checkbox checked={selectedMembers.includes(member.id)} />
                  <div>
                    <p className="font-medium text-gray-900">{member.first_name} {member.last_name}</p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignModal(false)}>Cancel</Button>
            <Button 
              onClick={handleAssignMembers}
              disabled={saving || selectedMembers.length === 0}
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Add {selectedMembers.length} Member{selectedMembers.length !== 1 && 's'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}