import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import { motion } from 'framer-motion';
import {
  Shield, AlertTriangle, CheckCircle, Clock, Plus, Upload,
  Mail, Loader2, XCircle, FileText, Calendar, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GlassCard, GlassCardContent, GlassCardHeader } from '@/components/ui/GlassCard';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { toast } from 'sonner';

const VETTING_TYPES = {
  garda_vetting: { label: 'Garda Vetting', icon: Shield, color: 'blue' },
  dbs: { label: 'DBS Check', icon: Shield, color: 'purple' },
  access_ni: { label: 'Access NI', icon: Shield, color: 'green' },
  tusla: { label: 'Tusla Check', icon: Shield, color: 'indigo' },
  safeguarding_1: { label: 'Safeguarding 1', icon: FileText, color: 'amber' },
  safeguarding_2: { label: 'Safeguarding 2', icon: FileText, color: 'amber' },
  safeguarding_3: { label: 'Safeguarding 3', icon: FileText, color: 'amber' },
  first_aid: { label: 'First Aid Cert', icon: FileText, color: 'red' },
  coaching_cert: { label: 'Coaching Cert', icon: FileText, color: 'teal' }
};

export default function VettingTracker({ members, vettingRecords, teams, onUpdate }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [sending, setSending] = useState(null);
  const [formData, setFormData] = useState({
    member_id: '',
    vetting_type: 'garda_vetting',
    vetting_id: '',
    issue_date: '',
    expiry_date: ''
  });
  const [saving, setSaving] = useState(false);

  // Filter to coaches/volunteers who need vetting
  const vettableMembers = members.filter(m => 
    ['coach', 'volunteer', 'committee'].includes(m.member_type)
  );

  // Calculate vetting status for each member
  const getMemberVettingStatus = (memberId) => {
    const records = vettingRecords.filter(r => r.member_id === memberId);
    
    const expired = records.filter(r => {
      if (!r.expiry_date) return false;
      return differenceInDays(parseISO(r.expiry_date), new Date()) < 0;
    });

    const expiringSoon = records.filter(r => {
      if (!r.expiry_date) return false;
      const daysLeft = differenceInDays(parseISO(r.expiry_date), new Date());
      return daysLeft >= 0 && daysLeft <= 60;
    });

    const valid = records.filter(r => {
      if (!r.expiry_date) return r.status === 'valid';
      return differenceInDays(parseISO(r.expiry_date), new Date()) > 60;
    });

    return { expired, expiringSoon, valid, records };
  };

  // Get alerts
  const expiringAlerts = vettingRecords.filter(r => {
    if (!r.expiry_date) return false;
    const daysLeft = differenceInDays(parseISO(r.expiry_date), new Date());
    return daysLeft >= 0 && daysLeft <= 60;
  });

  const expiredAlerts = vettingRecords.filter(r => {
    if (!r.expiry_date) return false;
    return differenceInDays(parseISO(r.expiry_date), new Date()) < 0;
  });

  // Check if member can be added to U18 team
  const canAddToU18Team = (memberId) => {
    const status = getMemberVettingStatus(memberId);
    const hasValidGarda = status.records.some(r => 
      r.vetting_type === 'garda_vetting' && 
      r.status === 'valid' &&
      (!r.expiry_date || differenceInDays(parseISO(r.expiry_date), new Date()) > 0)
    );
    return hasValidGarda;
  };

  const handleAddVetting = async () => {
    if (!formData.member_id) return;
    setSaving(true);

    try {
      const member = members.find(m => m.id === formData.member_id);
      await base44.entities.VettingRecord.create({
        club_id: member.club_id,
        member_id: formData.member_id,
        member_name: `${member.first_name} ${member.last_name}`,
        member_email: member.email,
        ...formData,
        status: formData.expiry_date ? 
          (differenceInDays(parseISO(formData.expiry_date), new Date()) < 0 ? 'expired' : 'valid') : 
          'valid'
      });

      toast.success('Vetting record added');
      setShowAddModal(false);
      setFormData({
        member_id: '',
        vetting_type: 'garda_vetting',
        vetting_id: '',
        issue_date: '',
        expiry_date: ''
      });
      onUpdate();
    } catch (error) {
      console.error('Error adding vetting:', error);
      toast.error('Failed to add record');
    } finally {
      setSaving(false);
    }
  };

  const sendReminder = async (record) => {
    setSending(record.id);
    try {
      if (record.member_email) {
        await base44.integrations.Core.SendEmail({
          to: record.member_email,
          subject: `Vetting Renewal Required: ${VETTING_TYPES[record.vetting_type]?.label}`,
          body: `Hi ${record.member_name},\n\nYour ${VETTING_TYPES[record.vetting_type]?.label} is expiring on ${format(parseISO(record.expiry_date), 'MMMM d, yyyy')}.\n\nPlease renew it as soon as possible to continue coaching.\n\nThanks!`
        });
        
        // Mark reminder as sent
        await base44.entities.VettingRecord.update(record.id, {
          reminder_sent: true,
          reminder_sent_date: format(new Date(), 'yyyy-MM-dd')
        });

        toast.success('Reminder sent');
        onUpdate();
      } else {
        toast.error('No email address available');
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error('Failed to send reminder');
    } finally {
      setSending(null);
    }
  };

  const getStatusBadge = (status, daysLeft) => {
    if (status === 'expired' || daysLeft < 0) {
      return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />Expired</Badge>;
    }
    if (daysLeft <= 60) {
      return <Badge className="bg-amber-100 text-amber-700"><Clock className="w-3 h-3 mr-1" />{daysLeft} days left</Badge>;
    }
    return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Valid</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {(expiredAlerts.length > 0 || expiringAlerts.length > 0) && (
        <div className="space-y-3">
          {expiredAlerts.length > 0 && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Expired Vetting ({expiredAlerts.length})</AlertTitle>
              <AlertDescription>
                {expiredAlerts.slice(0, 3).map(r => r.member_name).join(', ')}
                {expiredAlerts.length > 3 && ` and ${expiredAlerts.length - 3} more`}
                — These coaches cannot work with underage teams until renewed.
              </AlertDescription>
            </Alert>
          )}

          {expiringAlerts.length > 0 && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Expiring Soon ({expiringAlerts.length})</AlertTitle>
              <AlertDescription className="text-amber-700">
                {expiringAlerts.slice(0, 3).map(r => r.member_name).join(', ')}
                {expiringAlerts.length > 3 && ` and ${expiringAlerts.length - 3} more`}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Vetting & Certifications</h3>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Record
        </Button>
      </div>

      {/* Members List */}
      <div className="space-y-3">
        {vettableMembers.map((member, index) => {
          const status = getMemberVettingStatus(member.id);
          const canCoachU18 = canAddToU18Team(member.id);

          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
            >
              <GlassCard>
                <GlassCardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-indigo-100 text-indigo-600">
                        {member.first_name?.[0]}{member.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-gray-900">
                          {member.first_name} {member.last_name}
                        </h4>
                        <Badge variant="outline">{member.member_type}</Badge>
                        {canCoachU18 ? (
                          <Badge className="bg-green-100 text-green-700">
                            <Shield className="w-3 h-3 mr-1" />
                            U18 Cleared
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700">
                            <XCircle className="w-3 h-3 mr-1" />
                            U18 Blocked
                          </Badge>
                        )}
                      </div>

                      {/* Vetting Records */}
                      {status.records.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {status.records.map((record) => {
                            const typeConfig = VETTING_TYPES[record.vetting_type];
                            const daysLeft = record.expiry_date ? 
                              differenceInDays(parseISO(record.expiry_date), new Date()) : 999;

                            return (
                              <div key={record.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <typeConfig.icon className={`w-4 h-4 text-${typeConfig.color}-500`} />
                                  <span className="text-sm font-medium text-gray-700">{typeConfig.label}</span>
                                  {record.vetting_id && (
                                    <span className="text-xs text-gray-500">#{record.vetting_id}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {getStatusBadge(record.status, daysLeft)}
                                  {daysLeft <= 60 && daysLeft > 0 && !record.reminder_sent && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => sendReminder(record)}
                                      disabled={sending === record.id}
                                      className="h-7"
                                    >
                                      {sending === record.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Mail className="w-3 h-3" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 mt-2">No vetting records</p>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFormData({ ...formData, member_id: member.id });
                        setShowAddModal(true);
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </GlassCardContent>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {/* Add Vetting Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Vetting Record</DialogTitle>
            <DialogDescription>
              Record a new vetting or certification for a staff member
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Member</Label>
              <Select 
                value={formData.member_id} 
                onValueChange={(v) => setFormData({...formData, member_id: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {vettableMembers.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.first_name} {m.last_name} ({m.member_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Vetting Type</Label>
              <Select 
                value={formData.vetting_type} 
                onValueChange={(v) => setFormData({...formData, vetting_type: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(VETTING_TYPES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Reference Number</Label>
              <Input
                value={formData.vetting_id}
                onChange={(e) => setFormData({...formData, vetting_id: e.target.value})}
                placeholder="e.g., GV-123456"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Issue Date</Label>
                <Input
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) => setFormData({...formData, issue_date: e.target.value})}
                />
              </div>
              <div>
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddVetting} disabled={saving || !formData.member_id}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}