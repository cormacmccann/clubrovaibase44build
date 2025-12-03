import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import {
  AlertTriangle, CheckCircle, XCircle, Send, ChevronRight,
  Mail, Loader2, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function MemberComplianceList({ members, onRequestInfo, showIssuesOnly }) {
  const [sendingRequest, setSendingRequest] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [customMessage, setCustomMessage] = useState('');

  const openRequestModal = (member) => {
    setSelectedMember(member);
    const missingFields = member.complianceIssues?.map(i => i.message).join(', ');
    setCustomMessage(`Hi,\n\nWe need to update some information for ${member.first_name}'s club registration.\n\nMissing: ${missingFields}\n\nPlease click the link below to update this information.\n\nThanks!`);
    setShowRequestModal(true);
  };

  const sendInfoRequest = async () => {
    if (!selectedMember) return;
    setSendingRequest(selectedMember.id);

    try {
      // Get guardian email if child
      const recipientEmail = selectedMember.email || selectedMember.guardian_email;
      
      if (recipientEmail) {
        await base44.integrations.Core.SendEmail({
          to: recipientEmail,
          subject: `Action Required: Update Information for ${selectedMember.first_name}`,
          body: customMessage
        });
        toast.success('Request sent successfully');
      } else {
        toast.error('No email address available');
      }
    } catch (error) {
      console.error('Error sending request:', error);
      toast.error('Failed to send request');
    } finally {
      setSendingRequest(null);
      setShowRequestModal(false);
      setSelectedMember(null);
    }
  };

  const getSeverityBadge = (severity) => {
    if (severity === 'error') {
      return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />Required</Badge>;
    }
    return <Badge className="bg-amber-100 text-amber-700"><AlertTriangle className="w-3 h-3 mr-1" />Warning</Badge>;
  };

  if (members.length === 0) {
    return (
      <GlassCard>
        <GlassCardContent className="p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {showIssuesOnly ? 'No Compliance Issues' : 'No Members Found'}
          </h3>
          <p className="text-gray-500">
            {showIssuesOnly ? 'All members have complete data' : 'No members match your filters'}
          </p>
        </GlassCardContent>
      </GlassCard>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {members.map((member, index) => (
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
                    <AvatarFallback className={`${member.complianceIssues?.length > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      {member.first_name?.[0]}{member.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">
                        {member.first_name} {member.last_name}
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        {member.member_type}
                      </Badge>
                      {member.federation_data?.ngb_id && (
                        <Badge className="bg-green-100 text-green-700 text-xs">
                          NGB: {member.federation_data.ngb_id}
                        </Badge>
                      )}
                    </div>
                    
                    {member.complianceIssues?.length > 0 ? (
                      <div className="mt-2 space-y-1">
                        {member.complianceIssues.map((issue, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            {getSeverityBadge(issue.severity)}
                            <span className="text-gray-600">{issue.message}</span>
                            <Badge variant="outline" className="text-xs">{issue.ngb}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>All data complete</span>
                      </div>
                    )}
                  </div>

                  {member.complianceIssues?.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openRequestModal(member)}
                      disabled={sendingRequest === member.id}
                      className="gap-2"
                    >
                      {sendingRequest === member.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Request Info
                    </Button>
                  )}
                </div>
              </GlassCardContent>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Request Info Modal */}
      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Missing Information</DialogTitle>
            <DialogDescription>
              Send a request to {selectedMember?.first_name}'s guardian to update their information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm font-medium text-amber-800">Missing Information:</p>
              <ul className="text-sm text-amber-700 mt-1">
                {selectedMember?.complianceIssues?.map((issue, idx) => (
                  <li key={idx}>• {issue.message}</li>
                ))}
              </ul>
            </div>

            <div>
              <Textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={6}
                placeholder="Customize the message..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestModal(false)}>Cancel</Button>
            <Button onClick={sendInfoRequest} disabled={sendingRequest}>
              {sendingRequest ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}