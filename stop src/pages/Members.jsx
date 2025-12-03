import React, { useState, useEffect } from 'react';
import { useClub } from '@/components/ClubContext';
import { base44 } from '@/api/base44Client';
import { GlassCard, GlassCardContent, GlassCardHeader } from '@/components/ui/GlassCard';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInYears, parseISO, differenceInDays } from 'date-fns';
import {
  Users, Plus, Search, Filter, Upload, Download, UserPlus,
  Mail, Phone, Calendar, MapPin, Shield, ChevronRight, MoreVertical,
  X, Check, AlertTriangle, Loader2, FileSpreadsheet, Crown, FileText, Bell, CreditCard
} from 'lucide-react';
import MemberProfileDrawer from '@/components/members/MemberProfileDrawer';
import MembershipTiersManager from '@/components/members/MembershipTiersManager';
import GroupPaymentPlansManager from '@/components/members/GroupPaymentPlansManager';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

export default function Members() {
  const { currentClub, isClubAdmin } = useClub();
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [membershipTiers, setMembershipTiers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterTeam, setFilterTeam] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active');
  const [filterMembership, setFilterMembership] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [showTiersManager, setShowTiersManager] = useState(false);
  const [showPaymentPlans, setShowPaymentPlans] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [activeTab, setActiveTab] = useState('members');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    member_type: 'player',
    address: '',
    city: '',
    postal_code: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    medical_notes: '',
    teams: []
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
      const [membersData, teamsData, tiersData, docsData] = await Promise.all([
        base44.entities.Member.filter({ club_id: currentClub.id }),
        base44.entities.Team.filter({ club_id: currentClub.id, is_active: true }),
        base44.entities.MembershipTier.filter({ club_id: currentClub.id, is_active: true }),
        base44.entities.MemberDocument.filter({ club_id: currentClub.id })
      ]);
      setMembers(membersData);
      setTeams(teamsData);
      setMembershipTiers(tiersData);
      setDocuments(docsData);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate expiring documents and memberships
  const expiringDocs = documents.filter(doc => {
    if (!doc.expiry_date) return false;
    const daysUntilExpiry = differenceInDays(parseISO(doc.expiry_date), new Date());
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  });

  const expiredDocs = documents.filter(doc => {
    if (!doc.expiry_date) return false;
    return differenceInDays(parseISO(doc.expiry_date), new Date()) < 0;
  });

  const expiringMemberships = members.filter(m => {
    if (!m.membership_expires) return false;
    const daysUntilExpiry = differenceInDays(parseISO(m.membership_expires), new Date());
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  });

  const filteredMembers = members.filter(member => {
    const matchesSearch = 
      `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || member.member_type === filterType;
    const matchesTeam = filterTeam === 'all' || member.teams?.includes(filterTeam);
    const matchesStatus = filterStatus === 'all' || member.status === filterStatus;
    const matchesMembership = filterMembership === 'all' || member.membership_tier_id === filterMembership;
    return matchesSearch && matchesType && matchesTeam && matchesStatus && matchesMembership;
  });

  const openProfileDrawer = (member) => {
    setSelectedMember(member);
    setShowProfileDrawer(true);
  };

  const handleSaveMember = async () => {
    setSaving(true);
    try {
      const memberData = {
        ...formData,
        club_id: currentClub.id
      };

      if (selectedMember) {
        await base44.entities.Member.update(selectedMember.id, memberData);
      } else {
        await base44.entities.Member.create(memberData);
      }

      await loadData();
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving member:', error);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      date_of_birth: '',
      gender: '',
      member_type: 'player',
      address: '',
      city: '',
      postal_code: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      medical_notes: '',
      teams: []
    });
    setSelectedMember(null);
  };

  const openEditModal = (member) => {
    setSelectedMember(member);
    setFormData({
      first_name: member.first_name || '',
      last_name: member.last_name || '',
      email: member.email || '',
      phone: member.phone || '',
      date_of_birth: member.date_of_birth || '',
      gender: member.gender || '',
      member_type: member.member_type || 'player',
      address: member.address || '',
      city: member.city || '',
      postal_code: member.postal_code || '',
      emergency_contact_name: member.emergency_contact_name || '',
      emergency_contact_phone: member.emergency_contact_phone || '',
      medical_notes: member.medical_notes || '',
      teams: member.teams || []
    });
    setShowAddModal(true);
  };

  const getAge = (dob) => {
    if (!dob) return null;
    return differenceInYears(new Date(), parseISO(dob));
  };

  const getMemberTypeColor = (type) => {
    const colors = {
      player: 'bg-blue-100 text-blue-700',
      guardian: 'bg-purple-100 text-purple-700',
      coach: 'bg-green-100 text-green-700',
      volunteer: 'bg-amber-100 text-amber-700',
      committee: 'bg-red-100 text-red-700',
      social: 'bg-gray-100 text-gray-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-gray-100 text-gray-700',
      pending: 'bg-amber-100 text-amber-700',
      suspended: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Members</h1>
          <p className="text-gray-500 mt-1">{members.length} registered members</p>
        </div>
        {isClubAdmin && (
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowPaymentPlans(true)} className="gap-2">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Plans</span>
            </Button>
            <Button variant="outline" onClick={() => setShowTiersManager(true)} className="gap-2">
              <Crown className="w-4 h-4" />
              <span className="hidden sm:inline">Tiers</span>
            </Button>
            <Button variant="outline" onClick={() => setShowImportModal(true)} className="gap-2">
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Import</span>
            </Button>
            <Button 
              onClick={() => { resetForm(); setShowAddModal(true); }}
              className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
            >
              <UserPlus className="w-4 h-4" />
              Add Member
            </Button>
          </div>
        )}
      </div>

      {/* Alerts for expiring items */}
      {isClubAdmin && (expiringMemberships.length > 0 || expiringDocs.length > 0 || expiredDocs.length > 0) && (
        <div className="mb-6 space-y-3">
          {expiringMemberships.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <Bell className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">{expiringMemberships.length} Membership(s) Expiring Soon</p>
                <p className="text-sm text-amber-700 mt-1">
                  {expiringMemberships.slice(0, 3).map(m => `${m.first_name} ${m.last_name}`).join(', ')}
                  {expiringMemberships.length > 3 && ` and ${expiringMemberships.length - 3} more`}
                </p>
              </div>
            </div>
          )}
          {(expiringDocs.length > 0 || expiredDocs.length > 0) && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <FileText className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">
                  {expiredDocs.length > 0 && `${expiredDocs.length} Expired`}
                  {expiredDocs.length > 0 && expiringDocs.length > 0 && ' • '}
                  {expiringDocs.length > 0 && `${expiringDocs.length} Expiring Soon`}
                </p>
                <p className="text-sm text-red-700 mt-1">Member documents require attention</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <GlassCard className="mb-6">
        <GlassCardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-3 flex-wrap">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="player">Players</SelectItem>
                  <SelectItem value="guardian">Guardians</SelectItem>
                  <SelectItem value="coach">Coaches</SelectItem>
                  <SelectItem value="volunteer">Volunteers</SelectItem>
                  <SelectItem value="committee">Committee</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterTeam} onValueChange={setFilterTeam}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              {membershipTiers.length > 0 && (
                <Select value={filterMembership} onValueChange={setFilterMembership}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Membership" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    {membershipTiers.map(tier => (
                      <SelectItem key={tier.id} value={tier.id}>{tier.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Members List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : filteredMembers.length === 0 ? (
        <GlassCard>
          <GlassCardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No members found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'Try adjusting your search or filters' : 'Start by adding your first member'}
            </p>
            {isClubAdmin && !searchTerm && (
              <Button onClick={() => { resetForm(); setShowAddModal(true); }}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Member
              </Button>
            )}
          </GlassCardContent>
        </GlassCard>
      ) : (
        <div className="grid gap-4">
          {filteredMembers.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
            >
              <GlassCard hover className="cursor-pointer" onClick={() => openProfileDrawer(member)}>
                <GlassCardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={member.profile_photo_url} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                        {member.first_name?.[0]}{member.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">
                          {member.first_name} {member.last_name}
                        </h3>
                        <Badge variant="secondary" className={getMemberTypeColor(member.member_type)}>
                          {member.member_type}
                        </Badge>
                        <Badge variant="secondary" className={getStatusColor(member.status)}>
                          {member.status}
                        </Badge>
                        {member.membership_tier_name && (
                          <Badge variant="outline" className="text-xs">
                            <Crown className="w-3 h-3 mr-1" />
                            {member.membership_tier_name}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 flex-wrap">
                        {member.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5" />
                            {member.email}
                          </span>
                        )}
                        {member.date_of_birth && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {getAge(member.date_of_birth)} years
                          </span>
                        )}
                        {member.teams?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Shield className="w-3.5 h-3.5" />
                            {member.teams.length} team{member.teams.length !== 1 && 's'}
                          </span>
                        )}
                        {member.membership_status === 'expiring_soon' && (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
                            Expiring soon
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </GlassCardContent>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Member Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedMember ? 'Edit Member' : 'Add New Member'}</DialogTitle>
            <DialogDescription>
              {selectedMember ? 'Update member information' : 'Add a new member to your club'}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="emergency">Emergency</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    placeholder="First name"
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={formData.gender} onValueChange={(v) => setFormData({...formData, gender: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="member_type">Member Type</Label>
                <Select value={formData.member_type} onValueChange={(v) => setFormData({...formData, member_type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="player">Player</SelectItem>
                    <SelectItem value="guardian">Guardian</SelectItem>
                    <SelectItem value="coach">Coach</SelectItem>
                    <SelectItem value="volunteer">Volunteer</SelectItem>
                    <SelectItem value="committee">Committee</SelectItem>
                    <SelectItem value="social">Social Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="contact" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+353 12 345 6789"
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Street address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                    placeholder="Postal code"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="emergency" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                <Input
                  id="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={(e) => setFormData({...formData, emergency_contact_name: e.target.value})}
                  placeholder="Contact name"
                />
              </div>
              <div>
                <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                <Input
                  id="emergency_contact_phone"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => setFormData({...formData, emergency_contact_phone: e.target.value})}
                  placeholder="+353 12 345 6789"
                />
              </div>
              <div>
                <Label htmlFor="medical_notes">Medical Notes</Label>
                <Textarea
                  id="medical_notes"
                  value={formData.medical_notes}
                  onChange={(e) => setFormData({...formData, medical_notes: e.target.value})}
                  placeholder="Any allergies, conditions, or medical information..."
                  rows={4}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveMember} 
              disabled={saving || !formData.first_name || !formData.last_name}
              className="bg-gradient-to-r from-blue-500 to-indigo-600"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {selectedMember ? 'Update Member' : 'Add Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import CSV Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Import Members from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file with member data. We'll detect duplicates by email and Name + DOB combinations.
            </DialogDescription>
          </DialogHeader>

          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
            <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Drag and drop your CSV file here, or click to browse</p>
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Choose File
            </Button>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Fuzzy Duplicate Detection</p>
                <p className="text-amber-700 mt-1">
                  We'll check for existing members with matching email OR matching Name + Date of Birth. 
                  You'll be prompted to merge or create new for any matches found.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportModal(false)}>Cancel</Button>
            <Button disabled>Import Members</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Member Profile Drawer */}
      <MemberProfileDrawer
        member={selectedMember}
        open={showProfileDrawer}
        onClose={() => setShowProfileDrawer(false)}
        clubId={currentClub?.id}
      />

      {/* Membership Tiers Manager Modal */}
      <Dialog open={showTiersManager} onOpenChange={setShowTiersManager}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Membership Tiers & Packages</DialogTitle>
            <DialogDescription>
              Create and manage membership tiers with custom pricing and benefits
            </DialogDescription>
          </DialogHeader>
          <MembershipTiersManager />
        </DialogContent>
      </Dialog>

      {/* Group Payment Plans Modal */}
      <Dialog open={showPaymentPlans} onOpenChange={setShowPaymentPlans}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Group Payment Plans</DialogTitle>
            <DialogDescription>
              Create payment plans per team/group and assign members
            </DialogDescription>
          </DialogHeader>
          <GroupPaymentPlansManager onClose={() => setShowPaymentPlans(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}