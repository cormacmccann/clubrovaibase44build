import React from 'react';
import { Shield, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function SafeChatIndicator({ conversation, familyMembers }) {
  // Check if this is a child's team chat (safeguarded)
  const isChildTeamChat = familyMembers.some(member => 
    member.member_category === 'child' && 
    member.teams?.includes(conversation.team_id)
  );

  // Find which child this chat is for
  const childMember = familyMembers.find(member => 
    member.member_category === 'child' && 
    member.teams?.includes(conversation.team_id)
  );

  if (!isChildTeamChat || !childMember) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-green-600" />
            <Badge variant="secondary" className="bg-green-50 text-green-700 text-xs">
              {childMember.first_name}'s Chat
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            You're viewing as {childMember.first_name}'s guardian.<br/>
            All messages are monitored for safeguarding.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}