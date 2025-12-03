import React, { useState, useEffect } from 'react';
import { useClub } from '@/components/ClubContext';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import {
  Users, CreditCard, ChevronDown, ChevronUp, Loader2, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export default function FamilyPaymentsSummary() {
  const { currentClub, familyMembers, adultMember } = useClub();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (familyMembers.length > 0) {
      loadFamilyPayments();
    }
  }, [familyMembers]);

  const loadFamilyPayments = async () => {
    setLoading(true);
    try {
      // Get all pending payments for family members
      const allPayments = [];
      
      for (const member of familyMembers) {
        if (member.email) {
          const memberPayments = await base44.entities.Payment.filter({
            club_id: currentClub.id,
            member_email: member.email,
            status: 'pending'
          });
          allPayments.push(...memberPayments.map(p => ({
            ...p,
            member_name: `${member.first_name} ${member.last_name}`,
            member_category: member.member_category
          })));
        }
      }

      // Also check by member ID for children without email
      for (const member of familyMembers) {
        if (member.member_category === 'child') {
          const childPayments = await base44.entities.Payment.filter({
            club_id: currentClub.id,
            member_id: member.id,
            status: 'pending'
          });
          // Avoid duplicates
          childPayments.forEach(p => {
            if (!allPayments.find(ap => ap.id === p.id)) {
              allPayments.push({
                ...p,
                member_name: `${member.first_name} ${member.last_name}`,
                member_category: member.member_category
              });
            }
          });
        }
      }

      setPayments(allPayments);
    } catch (error) {
      console.error('Error loading family payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalDue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Group payments by family member
  const paymentsByMember = payments.reduce((acc, payment) => {
    const name = payment.member_name || 'Unknown';
    if (!acc[name]) acc[name] = [];
    acc[name].push(payment);
    return acc;
  }, {});

  const handlePayAll = async () => {
    // In a real implementation, this would create a Stripe checkout session
    alert(`Pay All Family Due: €${totalDue}\n\nThis would redirect to Stripe checkout with all items bundled.`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (payments.length === 0) {
    return null;
  }

  return (
    <GlassCard className="mb-6">
      <GlassCardContent className="p-5">
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Family Outstanding</h3>
                <p className="text-sm text-gray-500">{payments.length} pending payment{payments.length !== 1 && 's'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">€{totalDue.toFixed(2)}</p>
                <p className="text-xs text-gray-500">Total due</p>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon">
                  {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>

          <CollapsibleContent>
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
              {Object.entries(paymentsByMember).map(([memberName, memberPayments]) => (
                <div key={memberName} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{memberName}</span>
                    {memberPayments[0]?.member_category === 'child' && (
                      <Badge variant="outline" className="text-xs">Child</Badge>
                    )}
                  </div>
                  {memberPayments.map((payment) => (
                    <div 
                      key={payment.id} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg ml-4"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {payment.description || payment.payment_type}
                        </p>
                        {payment.due_date && (
                          <p className="text-xs text-gray-500">
                            Due: {format(parseISO(payment.due_date), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                      <p className="font-semibold text-gray-900">€{payment.amount?.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              ))}

              <Button 
                onClick={handlePayAll}
                className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Pay All Family Due (€{totalDue.toFixed(2)})
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </GlassCardContent>
    </GlassCard>
  );
}