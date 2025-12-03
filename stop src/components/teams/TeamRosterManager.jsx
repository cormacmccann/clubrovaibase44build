import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { format, parseISO, differenceInYears } from 'date-fns';
import {
  Users, UserPlus, Trash2, Mail, Phone, Search, Check,
  Loader2, MoreVertical, Shield, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function TeamRosterManager({ team, members, onUpdate }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [saving, setSaving] = useState(false);

  const teamMembers = members.filter(m => m.teams?.includes(team.id));
  const availableMembers = members.filter(m => !m.teams?.includes(team.id));

  const filteredAvailable = availableMembers.filter(m => 
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddMembers = async () => {
    setSaving(true);
    try {
      for (const memberId of selectedMembers) {
        const member = members.find(m => m.id === memberId);
        const currentTeams = member.teams || [];
        await base44.entities.Member.update(memberId, {
          teams: [...currentTeams, team.id]
        });
      }
      setShowAddModal(false);
      setSelectedMembers([]);
      onUpdate();
    } catch (error) {
      console.error('Error adding members:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (member) => {
    if (!confirm(`Remove ${member.first_name} from ${team.name}?`)) return;
    try {
      const updatedTeams = (member.teams || []).filter(t => t !== team.id);
      await base44.entities.Member.update(member.id, { teams: updatedTeams });
      onUpdate();
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const getAge = (dob) => {
    if (!dob) return null;
    return differenceInYears(new Date(), parseISO(dob));
  };

  const getMemberTypeColor = (type) => {
    const colors = {
      player: 'bg-blue-100 text-blue-700',
      coach: 'bg-purple-100 text-purple-700',
      guardian: 'bg-green-100 text-green-700',
      volunteer: 'bg-amber-100 text-amber-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Team Roster</h3>
          <p className="text-sm text-gray-500">{teamMembers.length} members</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} size="sm" className="gap-2">
          <UserPlus className="w-4 h-4" />
          Add Members
        </Button>
      </div>

      {teamMembers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>No members in this team yet</p>
          <Button variant="link" onClick={() => setShowAddModal(true)}>Add members</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {teamMembers.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={member.profile_photo_url} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    {member.first_name?.[0]}{member.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{member.first_name} {member.last_name}</p>
                    {member.jersey_number && (
                      <Badge variant="outline" className="text-xs">#{member.jersey_number}</Badge>
                    )}
                    <Badge variant="secondary" className={`text-xs capitalize ${getMemberTypeColor(member.member_type)}`}>
                      {member.member_type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {member.position && <span>{member.position}</span>}
                    {member.date_of_birth && <span>Age {getAge(member.date_of_birth)}</span>}
                    {member.email && <span>{member.email}</span>}
                  </div>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600" onClick={() => handleRemoveMember(member)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove from Team
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {/* Add Members Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Members to {team.name}</DialogTitle>
            <DialogDescription>
              Select members to add to this team
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-64">
            {filteredAvailable.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <p>No available members found</p>
              </div>
            ) : (
              filteredAvailable.map((member) => (
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
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                      {member.first_name?.[0]}{member.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{member.first_name} {member.last_name}</p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                  </div>
                  <Badge variant="secondary" className={`text-xs capitalize ${getMemberTypeColor(member.member_type)}`}>
                    {member.member_type}
                  </Badge>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button 
              onClick={handleAddMembers}
              disabled={saving || selectedMembers.length === 0}
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add {selectedMembers.length} Member{selectedMembers.length !== 1 && 's'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}