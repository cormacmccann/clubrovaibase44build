import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useClub } from '@/components/ClubContext';
import { base44 } from '@/api/base44Client';
import { GlassCard, GlassCardContent, GlassCardHeader } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';
import { format, parseISO, isPast, isFuture } from 'date-fns';
import {
  Trophy, Plus, Calendar, MapPin, Users, ExternalLink, Settings,
  Play, CheckCircle, Clock, Loader2, Shuffle, Edit2, Share2,
  CreditCard, Bell, UserPlus, ClipboardList
} from 'lucide-react';
import TournamentRegistrationForm from '@/components/tournaments/TournamentRegistrationForm';
import TournamentNotificationManager from '@/components/tournaments/TournamentNotificationManager';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Tournaments() {
  const { currentClub, isClubAdmin } = useClub();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBracketGenerator, setShowBracketGenerator] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showRegistrationsListModal, setShowRegistrationsListModal] = useState(false);
  const [registrations, setRegistrations] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sport_type: '',
    age_group: '',
    gender: 'mixed',
    start_date: '',
    end_date: '',
    venue: '',
    venue_address: '',
    entry_fee: 0,
    format: 'group_knockout',
    contact_email: '',
    contact_phone: ''
  });
  const [bracketConfig, setBracketConfig] = useState({
    num_teams: 8,
    teams_per_group: 4,
    teams_qualify_per_group: 2
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentClub?.id) {
      loadTournaments();
    }
  }, [currentClub?.id]);

  const loadTournaments = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Tournament.filter({ club_id: currentClub.id });
      setTournaments(data.sort((a, b) => new Date(b.start_date) - new Date(a.start_date)));
    } catch (error) {
      console.error('Error loading tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRegistrations = async (tournamentId) => {
    try {
      const data = await base44.entities.TournamentRegistration.filter({ tournament_id: tournamentId });
      setRegistrations(data);
    } catch (error) {
      console.error('Error loading registrations:', error);
    }
  };

  const openRegistrationsModal = async (tournament) => {
    setSelectedTournament(tournament);
    await loadRegistrations(tournament.id);
    setShowRegistrationsListModal(true);
  };

  const openNotificationsModal = (tournament) => {
    setSelectedTournament(tournament);
    setShowNotificationsModal(true);
  };

  const openPublicRegistration = (tournament) => {
    setSelectedTournament(tournament);
    setShowRegistrationModal(true);
  };

  const updateRegistrationStatus = async (registration, newStatus) => {
    try {
      await base44.entities.TournamentRegistration.update(registration.id, {
        registration_status: newStatus
      });

      // Send notification
      if (newStatus === 'confirmed') {
        await base44.entities.Notification.create({
          club_id: selectedTournament.club_id,
          type: 'tournament_update',
          recipient_type: 'tournament_participant',
          recipient_email: registration.contact_email,
          recipient_name: registration.contact_name,
          subject: `Registration Confirmed: ${selectedTournament.name}`,
          message: `Great news! Your team "${registration.team_name}" has been confirmed for ${selectedTournament.name}. ${selectedTournament.entry_fee > 0 && registration.payment_status !== 'paid' ? 'Please complete your payment to finalize registration.' : 'See you at the tournament!'}`,
          related_entity_type: 'tournament',
          related_entity_id: selectedTournament.id,
          status: 'pending'
        });
      }

      await loadRegistrations(selectedTournament.id);
    } catch (error) {
      console.error('Error updating registration:', error);
    }
  };

  const handleCreateTournament = async () => {
    setSaving(true);
    try {
      const tournamentData = {
        ...formData,
        club_id: currentClub.id,
        slug: formData.name.toLowerCase().replace(/\s+/g, '-'),
        status: 'draft',
        is_public: true,
        settings: {
          points_for_win: 3,
          points_for_draw: 1,
          teams_per_group: 4,
          teams_qualify_per_group: 2
        }
      };

      if (selectedTournament) {
        await base44.entities.Tournament.update(selectedTournament.id, tournamentData);
      } else {
        await base44.entities.Tournament.create(tournamentData);
      }

      await loadTournaments();
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving tournament:', error);
    } finally {
      setSaving(false);
    }
  };

  const generateBracket = async () => {
    if (!selectedTournament) return;
    
    setSaving(true);
    try {
      const { num_teams, teams_per_group, teams_qualify_per_group } = bracketConfig;
      const numGroups = Math.ceil(num_teams / teams_per_group);
      
      // Generate groups
      const groups = [];
      const letters = 'ABCDEFGH';
      for (let i = 0; i < numGroups; i++) {
        groups.push({
          name: `Group ${letters[i]}`,
          teams: []
        });
      }

      // Generate placeholder fixtures for groups
      const fixtures = [];
      let fixtureId = 1;
      
      groups.forEach((group, groupIndex) => {
        // Round robin within group
        for (let i = 0; i < teams_per_group; i++) {
          for (let j = i + 1; j < teams_per_group; j++) {
            fixtures.push({
              id: `F${fixtureId++}`,
              round: 'Group Stage',
              group: group.name,
              home_team_id: null,
              home_team_name: `TBD`,
              away_team_id: null,
              away_team_name: `TBD`,
              status: 'scheduled'
            });
          }
        }
      });

      // Add knockout fixtures
      const qualifiedTeams = numGroups * teams_qualify_per_group;
      if (qualifiedTeams >= 4) {
        // Semi-finals
        fixtures.push({
          id: `SF1`,
          round: 'Semi-Final',
          home_team_name: 'Winner QF1',
          away_team_name: 'Winner QF2',
          status: 'scheduled'
        });
        fixtures.push({
          id: `SF2`,
          round: 'Semi-Final',
          home_team_name: 'Winner QF3',
          away_team_name: 'Winner QF4',
          status: 'scheduled'
        });
        // Final
        fixtures.push({
          id: `F`,
          round: 'Final',
          home_team_name: 'Winner SF1',
          away_team_name: 'Winner SF2',
          status: 'scheduled'
        });
      }

      await base44.entities.Tournament.update(selectedTournament.id, {
        groups,
        fixtures,
        settings: {
          ...selectedTournament.settings,
          teams_per_group,
          teams_qualify_per_group
        }
      });

      await loadTournaments();
      setShowBracketGenerator(false);
    } catch (error) {
      console.error('Error generating bracket:', error);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      sport_type: '',
      age_group: '',
      gender: 'mixed',
      start_date: '',
      end_date: '',
      venue: '',
      venue_address: '',
      entry_fee: 0,
      format: 'group_knockout',
      contact_email: '',
      contact_phone: ''
    });
    setSelectedTournament(null);
  };

  const getStatusConfig = (tournament) => {
    if (tournament.status === 'completed') {
      return { icon: CheckCircle, color: 'bg-green-100 text-green-700', label: 'Completed' };
    }
    if (tournament.status === 'in_progress') {
      return { icon: Play, color: 'bg-blue-100 text-blue-700', label: 'Live' };
    }
    if (tournament.status === 'registration_open') {
      return { icon: Users, color: 'bg-purple-100 text-purple-700', label: 'Registration Open' };
    }
    return { icon: Clock, color: 'bg-gray-100 text-gray-700', label: 'Draft' };
  };

  const openEditModal = (tournament) => {
    setSelectedTournament(tournament);
    setFormData({
      name: tournament.name || '',
      description: tournament.description || '',
      sport_type: tournament.sport_type || '',
      age_group: tournament.age_group || '',
      gender: tournament.gender || 'mixed',
      start_date: tournament.start_date || '',
      end_date: tournament.end_date || '',
      venue: tournament.venue || '',
      venue_address: tournament.venue_address || '',
      entry_fee: tournament.entry_fee || 0,
      format: tournament.format || 'group_knockout',
      contact_email: tournament.contact_email || '',
      contact_phone: tournament.contact_phone || ''
    });
    setShowCreateModal(true);
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Tournaments</h1>
          <p className="text-gray-500 mt-1">Host and manage tournament events</p>
        </div>
        {isClubAdmin && (
          <Button 
            onClick={() => { resetForm(); setShowCreateModal(true); }}
            className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
          >
            <Plus className="w-4 h-4" />
            Create Tournament
          </Button>
        )}
      </div>

      {/* Tournaments Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : tournaments.length === 0 ? (
        <GlassCard>
          <GlassCardContent className="p-12 text-center">
            <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No tournaments yet</h3>
            <p className="text-gray-500 mb-4">Create your first tournament to get started</p>
            {isClubAdmin && (
              <Button onClick={() => { resetForm(); setShowCreateModal(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Create Tournament
              </Button>
            )}
          </GlassCardContent>
        </GlassCard>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {tournaments.map((tournament, index) => {
            const statusConfig = getStatusConfig(tournament);
            const StatusIcon = statusConfig.icon;
            
            return (
              <motion.div
                key={tournament.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <GlassCard className="h-full">
                  {tournament.banner_url && (
                    <img 
                      src={tournament.banner_url} 
                      alt="" 
                      className="w-full h-40 object-cover rounded-t-2xl"
                    />
                  )}
                  <GlassCardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{tournament.name}</h3>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="secondary" className={statusConfig.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                          {tournament.age_group && (
                            <Badge variant="outline">{tournament.age_group.toUpperCase()}</Badge>
                          )}
                          {tournament.gender && (
                            <Badge variant="outline" className="capitalize">{tournament.gender}</Badge>
                          )}
                        </div>
                      </div>
                      {tournament.logo_url && (
                        <img src={tournament.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
                      )}
                    </div>

                    {tournament.description && (
                      <p className="text-sm text-gray-500 mb-4 line-clamp-2">{tournament.description}</p>
                    )}

                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>
                          {format(parseISO(tournament.start_date), 'MMM d, yyyy')}
                          {tournament.end_date && ` - ${format(parseISO(tournament.end_date), 'MMM d, yyyy')}`}
                        </span>
                      </div>
                      {tournament.venue && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span>{tournament.venue}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-600">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>{tournament.registration_count || tournament.teams?.length || 0} teams registered</span>
                      </div>
                      {tournament.entry_fee > 0 && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <CreditCard className="w-4 h-4 text-gray-400" />
                          <span>€{tournament.entry_fee} entry fee</span>
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    {tournament.fixtures?.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-xl mb-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900">
                            {tournament.fixtures?.length || 0}
                          </div>
                          <div className="text-xs text-gray-500">Fixtures</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600">
                            {tournament.fixtures?.filter(f => f.status === 'completed').length || 0}
                          </div>
                          <div className="text-xs text-gray-500">Played</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600">
                            {tournament.groups?.length || 0}
                          </div>
                          <div className="text-xs text-gray-500">Groups</div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      {isClubAdmin && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openRegistrationsModal(tournament)}
                          >
                            <ClipboardList className="w-4 h-4 mr-1" />
                            Registrations
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openNotificationsModal(tournament)}
                          >
                            <Bell className="w-4 h-4 mr-1" />
                            Notify
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedTournament(tournament);
                              setShowBracketGenerator(true);
                            }}
                          >
                            <Shuffle className="w-4 h-4 mr-1" />
                            Fixtures
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => openEditModal(tournament)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                    <div className="flex gap-2 mt-2">
                      {tournament.status === 'registration_open' && (
                        <Button 
                          variant="outline"
                          className="flex-1"
                          onClick={() => openPublicRegistration(tournament)}
                        >
                          <UserPlus className="w-4 h-4 mr-1" />
                          Register Team
                        </Button>
                      )}
                      <Link to={createPageUrl(`TournamentLive?id=${tournament.id}`)} className="flex-1">
                        <Button className="w-full bg-gradient-to-r from-blue-500 to-indigo-600">
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Live View
                        </Button>
                      </Link>
                    </div>
                  </GlassCardContent>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Tournament Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTournament ? 'Edit Tournament' : 'Create Tournament'}</DialogTitle>
            <DialogDescription>
              Set up a tournament for your club to host
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Tournament Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Summer Blitz Cup 2024"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Tournament details..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="age_group">Age Group</Label>
                <Select value={formData.age_group} onValueChange={(v) => setFormData({...formData, age_group: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="u18">U18</SelectItem>
                    <SelectItem value="u16">U16</SelectItem>
                    <SelectItem value="u14">U14</SelectItem>
                    <SelectItem value="u12">U12</SelectItem>
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
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="venue">Venue</Label>
              <Input
                id="venue"
                value={formData.venue}
                onChange={(e) => setFormData({...formData, venue: e.target.value})}
                placeholder="Venue name"
              />
            </div>

            <div>
              <Label htmlFor="format">Tournament Format</Label>
              <Select value={formData.format} onValueChange={(v) => setFormData({...formData, format: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="knockout">Knockout</SelectItem>
                  <SelectItem value="round_robin">Round Robin</SelectItem>
                  <SelectItem value="group_knockout">Groups + Knockout</SelectItem>
                  <SelectItem value="swiss">Swiss System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="entry_fee">Entry Fee (€)</Label>
              <Input
                id="entry_fee"
                type="number"
                min="0"
                value={formData.entry_fee}
                onChange={(e) => setFormData({...formData, entry_fee: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateTournament} 
              disabled={saving || !formData.name || !formData.start_date}
              className="bg-gradient-to-r from-blue-500 to-indigo-600"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {selectedTournament ? 'Update' : 'Create Tournament'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Registration Modal */}
      <Dialog open={showRegistrationModal} onOpenChange={setShowRegistrationModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register for {selectedTournament?.name}</DialogTitle>
            <DialogDescription>
              Complete the form to register your team for this tournament
            </DialogDescription>
          </DialogHeader>
          {selectedTournament && (
            <TournamentRegistrationForm 
              tournament={selectedTournament}
              onSuccess={() => {
                setShowRegistrationModal(false);
                loadTournaments();
              }}
              onCancel={() => setShowRegistrationModal(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Registrations List Modal */}
      <Dialog open={showRegistrationsListModal} onOpenChange={setShowRegistrationsListModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrations: {selectedTournament?.name}</DialogTitle>
            <DialogDescription>
              {registrations.length} team(s) registered
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {registrations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No registrations yet</p>
              </div>
            ) : (
              registrations.map((reg) => (
                <div key={reg.id} className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{reg.team_name}</h4>
                      {reg.team_club_name && (
                        <p className="text-sm text-gray-500">{reg.team_club_name}</p>
                      )}
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span>{reg.contact_name}</span>
                        <span>{reg.contact_email}</span>
                        <span>{reg.players?.length || 0} players</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary" 
                        className={
                          reg.registration_status === 'confirmed' ? 'bg-green-100 text-green-700' :
                          reg.registration_status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-700'
                        }
                      >
                        {reg.registration_status}
                      </Badge>
                      {selectedTournament?.entry_fee > 0 && (
                        <Badge 
                          variant="secondary" 
                          className={
                            reg.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                          }
                        >
                          {reg.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                        </Badge>
                      )}
                      {reg.registration_status === 'pending' && (
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateRegistrationStatus(reg, 'confirmed')}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Confirm
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-red-600"
                            onClick={() => updateRegistrationStatus(reg, 'rejected')}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Notifications Modal */}
      <Dialog open={showNotificationsModal} onOpenChange={setShowNotificationsModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Notifications: {selectedTournament?.name}</DialogTitle>
            <DialogDescription>
              Send updates and manage notifications for participants
            </DialogDescription>
          </DialogHeader>
          {selectedTournament && (
            <TournamentNotificationManager tournament={selectedTournament} />
          )}
        </DialogContent>
      </Dialog>

      {/* Bracket Generator Modal */}
      <Dialog open={showBracketGenerator} onOpenChange={setShowBracketGenerator}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shuffle className="w-5 h-5" />
              Generate Fixtures
            </DialogTitle>
            <DialogDescription>
              Auto-generate groups, fixtures, and knockout brackets
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="num_teams">Number of Teams</Label>
              <Select 
                value={bracketConfig.num_teams.toString()} 
                onValueChange={(v) => setBracketConfig({...bracketConfig, num_teams: parseInt(v)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 Teams</SelectItem>
                  <SelectItem value="8">8 Teams</SelectItem>
                  <SelectItem value="12">12 Teams</SelectItem>
                  <SelectItem value="16">16 Teams</SelectItem>
                  <SelectItem value="24">24 Teams</SelectItem>
                  <SelectItem value="32">32 Teams</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Teams Per Group</Label>
                <Select 
                  value={bracketConfig.teams_per_group.toString()} 
                  onValueChange={(v) => setBracketConfig({...bracketConfig, teams_per_group: parseInt(v)})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 Teams</SelectItem>
                    <SelectItem value="4">4 Teams</SelectItem>
                    <SelectItem value="5">5 Teams</SelectItem>
                    <SelectItem value="6">6 Teams</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Qualify Per Group</Label>
                <Select 
                  value={bracketConfig.teams_qualify_per_group.toString()} 
                  onValueChange={(v) => setBracketConfig({...bracketConfig, teams_qualify_per_group: parseInt(v)})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Top 1</SelectItem>
                    <SelectItem value="2">Top 2</SelectItem>
                    <SelectItem value="3">Top 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2">Fixture Summary</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• {Math.ceil(bracketConfig.num_teams / bracketConfig.teams_per_group)} groups</li>
                <li>• Group matches + knockout rounds</li>
                <li>• {bracketConfig.teams_qualify_per_group * Math.ceil(bracketConfig.num_teams / bracketConfig.teams_per_group)} teams qualify for knockouts</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBracketGenerator(false)}>Cancel</Button>
            <Button 
              onClick={generateBracket}
              disabled={saving}
              className="bg-gradient-to-r from-blue-500 to-indigo-600"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shuffle className="w-4 h-4 mr-2" />}
              Generate Fixtures
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}