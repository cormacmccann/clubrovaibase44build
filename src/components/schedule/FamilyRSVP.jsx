import React from 'react';
import { Check, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function FamilyRSVP({ event, familyMembers, onRespond }) {
  // Filter family members who are part of this event's team
  const eligibleMembers = familyMembers.filter(member => {
    if (!event.team_id) return true; // Club-wide event
    return member.teams?.includes(event.team_id);
  });

  if (eligibleMembers.length === 0) {
    return null;
  }

  const getMemberResponse = (memberId) => {
    return event.attendance?.find(a => a.member_id === memberId)?.status;
  };

  const getTeamBadge = (member) => {
    // Find the team name for this member related to this event
    if (event.team_name) return event.team_name;
    return null;
  };

  return (
    <div className="space-y-2 mt-3 pt-3 border-t border-gray-100">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">RSVP for Family</p>
      {eligibleMembers.map((member) => {
        const response = getMemberResponse(member.id);
        const isChild = member.member_category === 'child';
        const teamBadge = getTeamBadge(member);

        return (
          <div 
            key={member.id} 
            className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <Avatar className="w-7 h-7">
                <AvatarFallback className={`text-xs ${isChild ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                  {member.first_name?.[0]}{member.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-gray-900">
                    {member.first_name}
                  </span>
                  {isChild && (
                    <Badge variant="outline" className="text-xs h-4 px-1">
                      {teamBadge || 'Child'}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={response === 'attending' ? 'default' : 'outline'}
                className={`h-7 px-2 ${response === 'attending' ? 'bg-green-500 hover:bg-green-600' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onRespond(event, member.id, 'attending');
                }}
              >
                <Check className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                variant={response === 'not_attending' ? 'default' : 'outline'}
                className={`h-7 px-2 ${response === 'not_attending' ? 'bg-red-500 hover:bg-red-600' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onRespond(event, member.id, 'not_attending');
                }}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}