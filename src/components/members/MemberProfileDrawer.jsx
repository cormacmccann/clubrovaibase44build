import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, parseISO, differenceInYears, differenceInDays } from 'date-fns';
import {
  User, Mail, Phone, Calendar, MapPin, Shield, CreditCard,
  FileText, Clock, CheckCircle, AlertTriangle, XCircle,
  ChevronRight, Upload, Loader2, TrendingUp, CalendarCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export default function MemberProfileDrawer({ member, open, onClose, clubId }) {
  const [activities, setActivities] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (member?.id && open) {
      loadMemberData();
    }
  }, [member?.id, open]);

  const loadMemberData = async () => {
    setLoading(true);
    try {
      const [activitiesData, documentsData, paymentsData] = await Promise.all([
        base44.entities.MemberActivity.filter({ member_id: member.id }),
        base44.entities.MemberDocument.filter({ member_id: member.id }),
        base44.entities.Payment.filter({ member_email: member.email, club_id: clubId })
      ]);
      setActivities(activitiesData.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
      setDocuments(documentsData);
      setPayments(paymentsData.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (error) {
      console.error('Error loading member data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!member) return null;

  const getAge = (dob) => {
    if (!dob) return null;
    return differenceInYears(new Date(), parseISO(dob));
  };

  const getMembershipStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-700',
      expiring_soon: 'bg-amber-100 text-amber-700',
      expired: 'bg-red-100 text-red-700',
      pending_renewal: 'bg-blue-100 text-blue-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getDocumentStatusColor = (status) => {
    const colors = {
      valid: 'bg-green-100 text-green-700',
      expiring_soon: 'bg-amber-100 text-amber-700',
      expired: 'bg-red-100 text-red-700',
      pending_review: 'bg-blue-100 text-blue-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getActivityIcon = (type) => {
    const icons = {
      attendance: CalendarCheck,
      payment: CreditCard,
      registration: User,
      document_upload: FileText,
      team_join: Shield,
      team_leave: Shield,
      role_change: User,
      note: FileText
    };
    return icons[type] || Clock;
  };

  const totalPaid = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const pendingPayments = payments.filter(p => p.status === 'pending');
  const expiredDocs = documents.filter(d => d.status === 'expired');
  const expiringDocs = documents.filter(d => d.status === 'expiring_soon');

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={member.profile_photo_url} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xl">
                {member.first_name?.[0]}{member.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <SheetTitle className="text-xl">
                {member.first_name} {member.last_name}
              </SheetTitle>
              <SheetDescription className="mt-1">
                <Badge variant="secondary" className="capitalize mr-2">
                  {member.member_type}
                </Badge>
                {member.membership_status && (
                  <Badge variant="secondary" className={getMembershipStatusColor(member.membership_status)}>
                    {member.membership_status?.replace('_', ' ')}
                  </Badge>
                )}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : (
            <Tabs defaultValue="overview" className="mt-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="documents">
                  Documents
                  {(expiredDocs.length + expiringDocs.length) > 0 && (
                    <span className="ml-1 w-2 h-2 rounded-full bg-amber-500" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4 mt-4">
                {/* Contact Info */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Contact Information</h4>
                  {member.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span>{member.email}</span>
                    </div>
                  )}
                  {member.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                  {member.date_of_birth && (
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{format(parseISO(member.date_of_birth), 'MMM d, yyyy')} ({getAge(member.date_of_birth)} years)</span>
                    </div>
                  )}
                  {(member.address || member.city) && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{[member.address, member.city].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* Membership */}
                {member.membership_tier_name && (
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{member.membership_tier_name}</span>
                      <Badge variant="secondary" className={getMembershipStatusColor(member.membership_status)}>
                        {member.membership_status?.replace('_', ' ')}
                      </Badge>
                    </div>
                    {member.membership_expires && (
                      <p className="text-sm text-gray-600">
                        Expires: {format(parseISO(member.membership_expires), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm">Attendance Rate</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {member.stats?.attendance_rate || 0}%
                    </p>
                    <Progress value={member.stats?.attendance_rate || 0} className="mt-2 h-2" />
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                      <CreditCard className="w-4 h-4" />
                      <span className="text-sm">Total Paid</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">€{totalPaid}</p>
                    {pendingPayments.length > 0 && (
                      <p className="text-xs text-amber-600 mt-1">{pendingPayments.length} pending</p>
                    )}
                  </div>
                </div>

                {/* Teams */}
                {member.teams?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Teams</h4>
                    <div className="flex flex-wrap gap-2">
                      {member.teams.map((teamId, i) => (
                        <Badge key={i} variant="outline" className="py-1">
                          <Shield className="w-3 h-3 mr-1" />
                          Team {i + 1}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Emergency Contact */}
                {member.emergency_contact_name && (
                  <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                    <h4 className="font-medium text-red-800 mb-2">Emergency Contact</h4>
                    <p className="text-sm text-red-700">{member.emergency_contact_name}</p>
                    {member.emergency_contact_phone && (
                      <p className="text-sm text-red-700">{member.emergency_contact_phone}</p>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="mt-4">
                {activities.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No activity recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activities.slice(0, 20).map((activity) => {
                      const ActivityIcon = getActivityIcon(activity.activity_type);
                      return (
                        <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="p-2 bg-white rounded-lg">
                            <ActivityIcon className="w-4 h-4 text-gray-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {format(parseISO(activity.created_date), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                          {activity.amount && (
                            <span className="text-sm font-medium text-gray-900">€{activity.amount}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="mt-4">
                {documents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No documents uploaded</p>
                    <Button variant="outline" size="sm" className="mt-3">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Document
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">{doc.name}</p>
                            <p className="text-xs text-gray-500 capitalize">{doc.document_type?.replace('_', ' ')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className={getDocumentStatusColor(doc.status)}>
                            {doc.status === 'valid' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {doc.status === 'expiring_soon' && <AlertTriangle className="w-3 h-3 mr-1" />}
                            {doc.status === 'expired' && <XCircle className="w-3 h-3 mr-1" />}
                            {doc.status?.replace('_', ' ')}
                          </Badge>
                          {doc.expiry_date && (
                            <p className="text-xs text-gray-500 mt-1">
                              Expires: {format(parseISO(doc.expiry_date), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" className="w-full">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload New Document
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Payments Tab */}
              <TabsContent value="payments" className="mt-4">
                {payments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CreditCard className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No payment history</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{payment.description || payment.payment_type}</p>
                          <p className="text-xs text-gray-500">
                            {format(parseISO(payment.created_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">€{payment.amount}</p>
                          <Badge 
                            variant="secondary" 
                            className={payment.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}
                          >
                            {payment.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}