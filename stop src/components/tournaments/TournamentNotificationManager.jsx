import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import {
  Bell, Send, Mail, MessageSquare, Users, Calendar,
  CheckCircle, AlertCircle, Clock, Loader2, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { GlassCard, GlassCardContent, GlassCardHeader } from '@/components/ui/GlassCard';

export default function TournamentNotificationManager({ tournament }) {
  const [registrations, setRegistrations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [messageData, setMessageData] = useState({
    type: 'tournament_update',
    subject: '',
    message: '',
    recipients: 'all'
  });

  useEffect(() => {
    if (tournament?.id) {
      loadData();
    }
  }, [tournament?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [regsData, notifsData] = await Promise.all([
        base44.entities.TournamentRegistration.filter({ tournament_id: tournament.id }),
        base44.entities.Notification.filter({ related_entity_id: tournament.id })
      ]);
      setRegistrations(regsData);
      setNotifications(notifsData.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendNotification = async () => {
    setSending(true);
    try {
      const recipients = messageData.recipients === 'all' 
        ? registrations.filter(r => r.notifications_enabled)
        : registrations.filter(r => r.registration_status === messageData.recipients && r.notifications_enabled);

      // Create notifications for each recipient
      const notificationPromises = recipients.map(reg => 
        base44.entities.Notification.create({
          club_id: tournament.club_id,
          type: messageData.type,
          recipient_type: 'tournament_participant',
          recipient_id: reg.id,
          recipient_email: reg.contact_email,
          recipient_name: reg.contact_name,
          subject: messageData.subject,
          message: messageData.message.replace('{team_name}', reg.team_name).replace('{tournament_name}', tournament.name),
          related_entity_type: 'tournament',
          related_entity_id: tournament.id,
          channel: 'email',
          status: 'pending'
        })
      );

      await Promise.all(notificationPromises);

      // Send emails
      for (const reg of recipients) {
        await base44.integrations.Core.SendEmail({
          to: reg.contact_email,
          subject: messageData.subject,
          body: messageData.message.replace('{team_name}', reg.team_name).replace('{tournament_name}', tournament.name)
        });
      }

      await loadData();
      setShowSendModal(false);
      setMessageData({ type: 'tournament_update', subject: '', message: '', recipients: 'all' });
    } catch (error) {
      console.error('Error sending notifications:', error);
    } finally {
      setSending(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-amber-100 text-amber-700',
      sent: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      read: 'bg-blue-100 text-blue-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const quickMessages = [
    {
      label: 'Schedule Published',
      subject: `${tournament.name} - Schedule Published`,
      message: `Dear {team_name},\n\nThe match schedule for ${tournament.name} has been published. Please log in to view your fixtures.\n\nGood luck!`
    },
    {
      label: 'Schedule Change',
      subject: `${tournament.name} - Schedule Update`,
      message: `Dear {team_name},\n\nPlease note there has been a change to the tournament schedule. Please check the updated fixtures on the tournament page.\n\nThank you for your understanding.`
    },
    {
      label: 'Match Reminder',
      subject: `${tournament.name} - Match Tomorrow`,
      message: `Dear {team_name},\n\nThis is a reminder that your next match is scheduled for tomorrow. Please arrive at the venue 30 minutes before kick-off.\n\nGood luck!`
    },
    {
      label: 'Payment Reminder',
      subject: `${tournament.name} - Payment Reminder`,
      message: `Dear {team_name},\n\nThis is a reminder that your entry fee payment for ${tournament.name} is still outstanding. Please complete payment to confirm your place.\n\nThank you.`
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
          <p className="text-sm text-gray-500">
            {registrations.filter(r => r.notifications_enabled).length} teams opted in for notifications
          </p>
        </div>
        <Button onClick={() => setShowSendModal(true)} className="gap-2">
          <Send className="w-4 h-4" />
          Send Notification
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard>
          <GlassCardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{registrations.length}</p>
            <p className="text-sm text-gray-500">Registered Teams</p>
          </GlassCardContent>
        </GlassCard>
        <GlassCard>
          <GlassCardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {notifications.filter(n => n.status === 'sent').length}
            </p>
            <p className="text-sm text-gray-500">Sent</p>
          </GlassCardContent>
        </GlassCard>
        <GlassCard>
          <GlassCardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {notifications.filter(n => n.status === 'pending').length}
            </p>
            <p className="text-sm text-gray-500">Pending</p>
          </GlassCardContent>
        </GlassCard>
        <GlassCard>
          <GlassCardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">
              {notifications.filter(n => n.status === 'failed').length}
            </p>
            <p className="text-sm text-gray-500">Failed</p>
          </GlassCardContent>
        </GlassCard>
      </div>

      {/* Recent Notifications */}
      <GlassCard>
        <GlassCardHeader className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-900">Recent Notifications</h4>
          <Button variant="ghost" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </GlassCardHeader>
        <GlassCardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No notifications sent yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.slice(0, 10).map((notif) => (
                <div key={notif.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{notif.subject}</p>
                        <Badge variant="secondary" className={getStatusColor(notif.status)}>
                          {notif.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">To: {notif.recipient_name}</p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {format(parseISO(notif.created_date), 'MMM d, h:mm a')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCardContent>
      </GlassCard>

      {/* Send Notification Modal */}
      <Dialog open={showSendModal} onOpenChange={setShowSendModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Notification</DialogTitle>
            <DialogDescription>
              Send an update to tournament participants
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Quick Templates */}
            <div>
              <Label>Quick Templates</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {quickMessages.map((msg, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={() => setMessageData({
                      ...messageData,
                      subject: msg.subject,
                      message: msg.message
                    })}
                  >
                    {msg.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label>Recipients</Label>
              <Select 
                value={messageData.recipients} 
                onValueChange={(v) => setMessageData({...messageData, recipients: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Registered Teams</SelectItem>
                  <SelectItem value="confirmed">Confirmed Teams Only</SelectItem>
                  <SelectItem value="pending">Pending Teams Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subject">Subject *</Label>
              <input
                id="subject"
                type="text"
                value={messageData.subject}
                onChange={(e) => setMessageData({...messageData, subject: e.target.value})}
                placeholder="Notification subject"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div>
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={messageData.message}
                onChange={(e) => setMessageData({...messageData, message: e.target.value})}
                placeholder="Your message to participants..."
                rows={6}
              />
              <p className="text-xs text-gray-500 mt-1">
                Use {'{team_name}'} and {'{tournament_name}'} as placeholders
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendModal(false)}>Cancel</Button>
            <Button 
              onClick={sendNotification}
              disabled={sending || !messageData.subject || !messageData.message}
              className="gap-2"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send to {messageData.recipients === 'all' 
                ? registrations.length 
                : registrations.filter(r => r.registration_status === messageData.recipients).length
              } teams
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}