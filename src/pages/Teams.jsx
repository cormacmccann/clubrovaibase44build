import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useClub } from '@/components/ClubContext';
import { base44 } from '@/api/base44Client';
import { GlassCard, GlassCardContent, GlassCardHeader } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';
import {
  Shield, Plus, Users, Calendar, Link as LinkIcon, Copy, 
  Check, Settings, ChevronRight, Trophy, Share2, Loader2,
  Clock, MapPin, Edit2, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Teams() {
  const { currentClub, isClubAdmin, isCoach } = useClub();
  const [teams, setTeams] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age_group: '',
    gender: 'mixed',
    division: '',
    season: '2024/25',
    home_venue: '',
    training_schedule: []
  });
  const [saving, setSaving] = useState(false);

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
        base44.entities.Member.filter({ club_id: currentClub.id, member_type: 'player' })
      ]);
      setTeams(teamsData);
      setMembers(membersData);
    } catch (error) {
      console.error('Error loading teams:', error);
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
        join_code: Math.random().toString(36).substring(2, 10),
        is_active: true
      };

      if (selectedTeam) {
        await base44.entities.Team.update(selectedTeam.id, teamData);
      } else {
        await base44.entities.Team.create(teamData);
      }

      await loadData();
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving team:', error);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      age_group: '',
      gender: 'mixed',
      division: '',
      season: '2024/25',
      home_venue: '',
      training_schedule: []
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
      season: team.season || '2024/25',
      home_venue: team.home_venue || '',
      training_schedule: team.training_schedule || []
    });
    setShowAddModal(true);
  };

  const openShareModal = (team) => {
    setSelectedTeam(team);
    setShowShareModal(true);
    setCopiedLink(false);
  };

  const copyJoinLink = () => {
    const link = `${window.location.origin}/JoinTeam?code=${selectedTeam?.join_code}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const getTeamPlayerCount = (team) => {
    return members.filter(m => team.players?.includes(m.id)).length;
  };

  const getGenderIcon = (gender) => {
    const colors = {
      male: 'bg-blue-100 text-blue-700',
      female: 'bg-pink-100 text-pink-700',
      mixed: 'bg-purple-100 text-purple-700'
    };
    return colors[gender] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Teams</h1>
          <p className="text-gray-500 mt-1">{teams.length} teams in {currentClub?.name}</p>
        </div>
        {isClubAdmin && (
          <Button 
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
          >
            <Plus className="w-4 h-4" />
            Create Team
          </Button>
        )}
      </div>

      {/* Teams Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : teams.length === 0 ? (
        <GlassCard>
          <GlassCardContent className="p-12 text-center">
            <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No teams yet</h3>
            <p className="text-gray-500 mb-4">Create your first team to get started</p>
            {isClubAdmin && (
              <Button onClick={() => { resetForm(); setShowAddModal(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Create Team
              </Button>
            )}
          </GlassCardContent>
        </GlassCard>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team, index) => (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <GlassCard className="h-full">
                <GlassCardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {team.logo_url ? (
                        <img src={team.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                          {team.name?.[0]}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900">{team.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {team.age_group && (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-700 text-xs">
                              {team.age_group.toUpperCase()}
                            </Badge>
                          )}
                          <Badge variant="secondary" className={`${getGenderIcon(team.gender)} text-xs`}>
                            {team.gender}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {(isClubAdmin || isCoach) && (
                      <Button variant="ghost" size="icon" onClick={() => openEditModal(team)}>
                        <Settings className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span>{getTeamPlayerCount(team)} players</span>
                    </div>
                    {team.division && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Trophy className="w-4 h-4 text-gray-400" />
                        <span>{team.division}</span>
                      </div>
                    )}
                    {team.home_venue && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{team.home_venue}</span>
                      </div>
                    )}
                    {team.training_schedule?.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{team.training_schedule.length} training sessions/week</span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  {team.stats && (
                    <div className="grid grid-cols-4 gap-2 p-3 bg-gray-50 rounded-xl mb-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">{team.stats.played || 0}</div>
                        <div className="text-xs text-gray-500">P</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">{team.stats.won || 0}</div>
                        <div className="text-xs text-gray-500">W</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-amber-600">{team.stats.drawn || 0}</div>
                        <div className="text-xs text-gray-500">D</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">{team.stats.lost || 0}</div>
                        <div className="text-xs text-gray-500">L</div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => openShareModal(team)}
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Invite
                    </Button>
                    <Link to={createPageUrl('TeamManagement')} className="flex-1">
                      <Button className="w-full bg-gradient-to-r from-blue-500 to-indigo-600">
                        View Team
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </GlassCardContent>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Team Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedTeam ? 'Edit Team' : 'Create New Team'}</DialogTitle>
            <DialogDescription>
              {selectedTeam ? 'Update team information' : 'Set up a new team for your club'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Team Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., U14 Tigers"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="age_group">Age Group</Label>
                <Select value={formData.age_group} onValueChange={(v) => setFormData({...formData, age_group: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select age group" />
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
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div>
              <Label htmlFor="home_venue">Home Venue</Label>
              <Input
                id="home_venue"
                value={formData.home_venue}
                onChange={(e) => setFormData({...formData, home_venue: e.target.value})}
                placeholder="Main pitch name or address"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveTeam} 
              disabled={saving || !formData.name}
              className="bg-gradient-to-r from-blue-500 to-indigo-600"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {selectedTeam ? 'Update Team' : 'Create Team'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share/Invite Modal */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Players to {selectedTeam?.name}</DialogTitle>
            <DialogDescription>
              Share this magic link on WhatsApp or email to invite players and families to join
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <Label className="text-xs text-gray-500 uppercase tracking-wider">Join Link</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input 
                  readOnly 
                  value={`${window.location.origin}/JoinTeam?code=${selectedTeam?.join_code}`}
                  className="text-sm font-mono"
                />
                <Button variant="outline" size="icon" onClick={copyJoinLink}>
                  {copiedLink ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex items-start gap-3">
                <LinkIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800">Magic Link Features</p>
                  <ul className="text-blue-700 mt-1 space-y-1">
                    <li>• One-click join for parents and players</li>
                    <li>• Automatically links families together</li>
                    <li>• Prompts to add children as dependents</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button className="w-full bg-green-600 hover:bg-green-700" onClick={copyJoinLink}>
              <Share2 className="w-4 h-4 mr-2" />
              Copy & Share on WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}