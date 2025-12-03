import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useClub } from '@/components/ClubContext';
import { base44 } from '@/api/base44Client';
import { GlassCard, GlassCardContent, GlassCardHeader } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import {
  Users, Plus, Settings, UserPlus, CreditCard, Trophy, Mail, Phone,
  ChevronRight, Edit2, Trash2, Loader2, Search, Filter, MoreVertical,
  Calendar, MapPin, Clock, CheckCircle, AlertCircle, Send, Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import TeamRosterManager from '@/components/teams/TeamRosterManager';
import TeamPaymentPlans from '@/components/teams/TeamPaymentPlans';
import TeamTournaments from '@/components/teams/TeamTournaments';
import TeamSettingsPanel from '@/components/teams/TeamSettingsPanel';

export default function TeamManagement() {
  const { currentClub, isClubAdmin, isCoach } = useClub();
  const [teams, setTeams] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAgeGroup, setFilterAgeGroup] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTeamDetail, setShowTeamDetail] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age_group: '',
    gender: 'mixed',
    division: '',
    season: '',
    home_venue: '',
    contact_person: { name: '', email: '', phone: '', role: 'Manager' },
    fee_structure: { registration_fee: 0, monthly_fee: 0, match_fee: 0 },
    settings: { allow_public_join: false, require_approval: true, max_players: 25 }
  });

  useEffect(() => {
    if (currentClub?.id) {
      loadData();
    }
  }, [currentClub?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [teamsData, membersData] = await Promise.all([
        base44.entities.Team.filter({ club_id: currentClub.id }),
        base44.entities.Member.filter({ club_id: currentClub.id })
      ]);
      setTeams(teamsData);
      setMembers(membersData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTeam = async () => {
    setSaving(true);
    try {
      const teamData = {
        ...formData,
        club_id: currentClub.id,
        slug: formData.name.toLowerCase().replace(/\s+/g, '-'),
        is_active: true,
        join_code: selectedTeam?.join_code || Math.random().toString(36).substring(2, 8).toUpperCase()
      };

      if (selectedTeam) {
        await base44.entities.Team.update(selectedTeam.id, teamData);
      } else {
        await base44.entities.Team.create(teamData);
      }

      await loadData();
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving team:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeam = async (team) => {
    if (!confirm(`Delete "${team.name}"? This cannot be undone.`)) return;
    try {
      await base44.entities.Team.delete(team.id);
      await loadData();
    } catch (error) {
      console.error('Error deleting team:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      age_group: '',
      gender: 'mixed',
      division: '',
      season: '',
      home_venue: '',
      contact_person: { name: '', email: '', phone: '', role: 'Manager' },
      fee_structure: { registration_fee: 0, monthly_fee: 0, match_fee: 0 },
      settings: { allow_public_join: false, require_approval: true, max_players: 25 }
    });
    setSelectedTeam(null);
  };

  const openEditModal = (team) => {
    setSelectedTeam(team);
    setFormData({
      name: team.name || '',
      age_group: team.age_group || '',
      gender: team.gender || 'mixed',
      division: team.division || '',
      season: team.season || '',
      home_venue: team.home_venue || '',
      contact_person: team.contact_person || { name: '', email: '', phone: '', role: 'Manager' },
      fee_structure: team.fee_structure || { registration_fee: 0, monthly_fee: 0, match_fee: 0 },
      settings: team.settings || { allow_public_join: false, require_approval: true, max_players: 25 }
    });
    setShowCreateModal(true);
  };

  const openTeamDetail = (team) => {
    setSelectedTeam(team);
    setShowTeamDetail(true);
  };

  const getTeamPlayerCount = (team) => {
    return members.filter(m => m.teams?.includes(team.id)).length;
  };

  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAgeGroup = filterAgeGroup === 'all' || team.age_group === filterAgeGroup;
    return matchesSearch && matchesAgeGroup;
  });

  const ageGroups = [...new Set(teams.map(t => t.age_group).filter(Boolean))];

  const getGenderColor = (gender) => {
    const colors = {
      male: 'bg-blue-100 text-blue-700',
      female: 'bg-pink-100 text-pink-700',
      mixed: 'bg-purple-100 text-purple-700'
    };
    return colors[gender] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team & Group Management</h1>
          <p className="text-gray-500">Manage teams, rosters, fees, and registrations</p>
        </div>
        {isClubAdmin && (
          <Button onClick={() => { resetForm(); setShowCreateModal(true); }} className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600">
            <Plus className="w-4 h-4" />
            Create Team
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search teams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterAgeGroup} onValueChange={setFilterAgeGroup}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Age Group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ages</SelectItem>
            {ageGroups.map(ag => (
              <SelectItem key={ag} value={ag}>{ag}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Teams Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No teams found</h3>
          <p className="text-gray-500 mb-4">Create your first team to get started</p>
          {isClubAdmin && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Team
            </Button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeams.map((team, index) => {
            const playerCount = getTeamPlayerCount(team);
            const maxPlayers = team.settings?.max_players || 25;
            const fillPercent = Math.min((playerCount / maxPlayers) * 100, 100);

            return (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <GlassCard className="h-full cursor-pointer" onClick={() => openTeamDetail(team)}>
                  <GlassCardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                          {team.name?.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{team.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            {team.age_group && (
                              <Badge variant="outline" className="text-xs">{team.age_group}</Badge>
                            )}
                            <Badge variant="secondary" className={`text-xs capitalize ${getGenderColor(team.gender)}`}>
                              {team.gender}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditModal(team); }}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit Team
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openTeamDetail(team); }}>
                            <Users className="w-4 h-4 mr-2" />
                            Manage Roster
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={(e) => { e.stopPropagation(); handleDeleteTeam(team); }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Team
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Player Count */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-500">Roster</span>
                        <span className="font-medium">{playerCount} / {maxPlayers}</span>
                      </div>
                      <Progress value={fillPercent} className="h-2" />
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <Users className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                        <p className="text-xs text-gray-500">Players</p>
                        <p className="font-semibold text-gray-900">{playerCount}</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <CreditCard className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                        <p className="text-xs text-gray-500">Fee</p>
                        <p className="font-semibold text-gray-900">€{team.fee_structure?.registration_fee || 0}</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <Trophy className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                        <p className="text-xs text-gray-500">Events</p>
                        <p className="font-semibold text-gray-900">{team.stats?.played || 0}</p>
                      </div>
                    </div>

                    {/* Contact Person */}
                    {team.contact_person?.name && (
                      <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg text-sm">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                            {team.contact_person.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{team.contact_person.name}</p>
                          <p className="text-xs text-gray-500">{team.contact_person.role}</p>
                        </div>
                      </div>
                    )}

                    <Button variant="ghost" className="w-full mt-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                      View Details
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </GlassCardContent>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Team Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTeam ? 'Edit Team' : 'Create New Team'}</DialogTitle>
            <DialogDescription>
              Set up team details, contact person, and fee structure
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Basic Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Team Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., U14 Girls A"
                  />
                </div>
                <div>
                  <Label htmlFor="age_group">Age Group</Label>
                  <Select value={formData.age_group} onValueChange={(v) => setFormData({...formData, age_group: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="senior">Senior</SelectItem>
                      <SelectItem value="u21">U21</SelectItem>
                      <SelectItem value="u19">U19</SelectItem>
                      <SelectItem value="u18">U18</SelectItem>
                      <SelectItem value="u17">U17</SelectItem>
                      <SelectItem value="u16">U16</SelectItem>
                      <SelectItem value="u15">U15</SelectItem>
                      <SelectItem value="u14">U14</SelectItem>
                      <SelectItem value="u13">U13</SelectItem>
                      <SelectItem value="u12">U12</SelectItem>
                      <SelectItem value="u11">U11</SelectItem>
                      <SelectItem value="u10">U10</SelectItem>
                      <SelectItem value="u9">U9</SelectItem>
                      <SelectItem value="u8">U8</SelectItem>
                      <SelectItem value="mini">Mini</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={formData.gender} onValueChange={(v) => setFormData({...formData, gender: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="division">Division/League</Label>
                  <Input
                    id="division"
                    value={formData.division}
                    onChange={(e) => setFormData({...formData, division: e.target.value})}
                    placeholder="e.g., Division 1"
                  />
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
                <div className="col-span-2">
                  <Label htmlFor="home_venue">Home Venue</Label>
                  <Input
                    id="home_venue"
                    value={formData.home_venue}
                    onChange={(e) => setFormData({...formData, home_venue: e.target.value})}
                    placeholder="e.g., Club Grounds, Pitch 2"
                  />
                </div>
              </div>
            </div>

            {/* Contact Person */}
            <div className="space-y-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <h4 className="font-medium text-blue-900">Team Contact Person</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-blue-800">Name</Label>
                  <Input
                    value={formData.contact_person.name}
                    onChange={(e) => setFormData({
                      ...formData, 
                      contact_person: {...formData.contact_person, name: e.target.value}
                    })}
                    placeholder="Contact name"
                  />
                </div>
                <div>
                  <Label className="text-blue-800">Role</Label>
                  <Select 
                    value={formData.contact_person.role} 
                    onValueChange={(v) => setFormData({
                      ...formData, 
                      contact_person: {...formData.contact_person, role: v}
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Manager">Manager</SelectItem>
                      <SelectItem value="Head Coach">Head Coach</SelectItem>
                      <SelectItem value="Assistant Coach">Assistant Coach</SelectItem>
                      <SelectItem value="Team Admin">Team Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-blue-800">Email</Label>
                  <Input
                    type="email"
                    value={formData.contact_person.email}
                    onChange={(e) => setFormData({
                      ...formData, 
                      contact_person: {...formData.contact_person, email: e.target.value}
                    })}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <Label className="text-blue-800">Phone</Label>
                  <Input
                    value={formData.contact_person.phone}
                    onChange={(e) => setFormData({
                      ...formData, 
                      contact_person: {...formData.contact_person, phone: e.target.value}
                    })}
                    placeholder="+353..."
                  />
                </div>
              </div>
            </div>

            {/* Fee Structure */}
            <div className="space-y-4 p-4 bg-green-50 rounded-xl border border-green-100">
              <h4 className="font-medium text-green-900">Fee Structure</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-green-800">Registration Fee (€)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.fee_structure.registration_fee}
                    onChange={(e) => setFormData({
                      ...formData, 
                      fee_structure: {...formData.fee_structure, registration_fee: parseFloat(e.target.value) || 0}
                    })}
                  />
                </div>
                <div>
                  <Label className="text-green-800">Monthly Fee (€)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.fee_structure.monthly_fee}
                    onChange={(e) => setFormData({
                      ...formData, 
                      fee_structure: {...formData.fee_structure, monthly_fee: parseFloat(e.target.value) || 0}
                    })}
                  />
                </div>
                <div>
                  <Label className="text-green-800">Match Fee (€)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.fee_structure.match_fee}
                    onChange={(e) => setFormData({
                      ...formData, 
                      fee_structure: {...formData.fee_structure, match_fee: parseFloat(e.target.value) || 0}
                    })}
                  />
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Team Settings</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Max Players</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.settings.max_players}
                    onChange={(e) => setFormData({
                      ...formData, 
                      settings: {...formData.settings, max_players: parseInt(e.target.value) || 25}
                    })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveTeam}
              disabled={saving || !formData.name}
              className="bg-gradient-to-r from-blue-500 to-indigo-600"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedTeam ? 'Update Team' : 'Create Team'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Detail Modal */}
      <Dialog open={showTeamDetail} onOpenChange={setShowTeamDetail}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl">
                {selectedTeam?.name?.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <DialogTitle className="text-xl">{selectedTeam?.name}</DialogTitle>
                <DialogDescription className="flex items-center gap-2 mt-1">
                  {selectedTeam?.age_group && <Badge variant="outline">{selectedTeam.age_group}</Badge>}
                  {selectedTeam?.division && <span className="text-gray-500">{selectedTeam.division}</span>}
                  {selectedTeam?.season && <span className="text-gray-500">• {selectedTeam.season}</span>}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="roster" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="roster">Roster</TabsTrigger>
              <TabsTrigger value="payments">Payment Plans</TabsTrigger>
              <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              <TabsContent value="roster" className="m-0">
                {selectedTeam && (
                  <TeamRosterManager 
                    team={selectedTeam} 
                    members={members}
                    onUpdate={loadData}
                  />
                )}
              </TabsContent>

              <TabsContent value="payments" className="m-0">
                {selectedTeam && (
                  <TeamPaymentPlans 
                    team={selectedTeam}
                    members={members.filter(m => m.teams?.includes(selectedTeam.id))}
                  />
                )}
              </TabsContent>

              <TabsContent value="tournaments" className="m-0">
                {selectedTeam && <TeamTournaments team={selectedTeam} />}
              </TabsContent>

              <TabsContent value="settings" className="m-0">
                {selectedTeam && (
                  <TeamSettingsPanel 
                    team={selectedTeam}
                    onUpdate={loadData}
                  />
                )}
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}