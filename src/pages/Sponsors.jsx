import React, { useState, useEffect } from 'react';
import { useClub } from '@/components/ClubContext';
import { base44 } from '@/api/base44Client';
import { GlassCard, GlassCardContent, GlassCardHeader } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';
import { format, parseISO, differenceInDays } from 'date-fns';
import {
  Megaphone, Plus, Building2, Globe, Mail, Phone, Calendar,
  DollarSign, Image, Upload, AlertCircle, CheckCircle, Clock,
  Loader2, ExternalLink, ChevronRight, Tv, Layout
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function Sponsors() {
  const { currentClub, isClubAdmin } = useClub();
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSponsor, setSelectedSponsor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    logo_url: '',
    website: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    tier: 'bronze',
    sponsorship_type: 'general',
    annual_value: 0,
    start_date: '',
    end_date: '',
    benefits: [],
    notes: '',
    display_on_loading_screen: false,
    display_on_match_graphics: false
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentClub?.id) {
      loadSponsors();
    }
  }, [currentClub?.id]);

  const loadSponsors = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Sponsor.filter({ club_id: currentClub.id });
      setSponsors(data);
    } catch (error) {
      console.error('Error loading sponsors:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sponsors expiring soon
  const expiringSoon = sponsors.filter(s => {
    if (!s.end_date || s.status !== 'active') return false;
    const daysUntilExpiry = differenceInDays(parseISO(s.end_date), new Date());
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const sponsorData = {
        ...formData,
        club_id: currentClub.id,
        status: 'active'
      };

      if (selectedSponsor) {
        await base44.entities.Sponsor.update(selectedSponsor.id, sponsorData);
      } else {
        await base44.entities.Sponsor.create(sponsorData);
      }

      await loadSponsors();
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving sponsor:', error);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      logo_url: '',
      website: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      tier: 'bronze',
      sponsorship_type: 'general',
      annual_value: 0,
      start_date: '',
      end_date: '',
      benefits: [],
      notes: '',
      display_on_loading_screen: false,
      display_on_match_graphics: false
    });
    setSelectedSponsor(null);
  };

  const openEditModal = (sponsor) => {
    setSelectedSponsor(sponsor);
    setFormData({
      name: sponsor.name || '',
      logo_url: sponsor.logo_url || '',
      website: sponsor.website || '',
      contact_name: sponsor.contact_name || '',
      contact_email: sponsor.contact_email || '',
      contact_phone: sponsor.contact_phone || '',
      tier: sponsor.tier || 'bronze',
      sponsorship_type: sponsor.sponsorship_type || 'general',
      annual_value: sponsor.annual_value || 0,
      start_date: sponsor.start_date || '',
      end_date: sponsor.end_date || '',
      benefits: sponsor.benefits || [],
      notes: sponsor.notes || '',
      display_on_loading_screen: sponsor.display_on_loading_screen || false,
      display_on_match_graphics: sponsor.display_on_match_graphics || false
    });
    setShowAddModal(true);
  };

  const getTierConfig = (tier) => {
    const configs = {
      platinum: { color: 'from-gray-300 to-gray-400', textColor: 'text-gray-700', label: 'Platinum' },
      gold: { color: 'from-amber-400 to-yellow-500', textColor: 'text-amber-700', label: 'Gold' },
      silver: { color: 'from-gray-200 to-gray-300', textColor: 'text-gray-600', label: 'Silver' },
      bronze: { color: 'from-orange-300 to-orange-400', textColor: 'text-orange-700', label: 'Bronze' },
      community: { color: 'from-green-400 to-emerald-500', textColor: 'text-green-700', label: 'Community' }
    };
    return configs[tier] || configs.bronze;
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-700',
      prospect: 'bg-blue-100 text-blue-700',
      expired: 'bg-gray-100 text-gray-700',
      churned: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const totalAnnualValue = sponsors
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + (s.annual_value || 0), 0);

  const groupedByTier = sponsors.reduce((acc, sponsor) => {
    const tier = sponsor.tier || 'bronze';
    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(sponsor);
    return acc;
  }, {});

  const tierOrder = ['platinum', 'gold', 'silver', 'bronze', 'community'];

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Sponsors</h1>
          <p className="text-gray-500 mt-1">{sponsors.length} sponsors • €{totalAnnualValue.toLocaleString()} annual value</p>
        </div>
        {isClubAdmin && (
          <Button 
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
          >
            <Plus className="w-4 h-4" />
            Add Sponsor
          </Button>
        )}
      </div>

      {/* Expiring Soon Alert */}
      {expiringSoon.length > 0 && (
        <Alert className="mb-6 border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Sponsorships Expiring Soon</AlertTitle>
          <AlertDescription className="text-amber-700">
            {expiringSoon.map(s => s.name).join(', ')} - time to start renewal conversations!
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {tierOrder.filter(t => groupedByTier[t]?.length > 0).map(tier => {
          const config = getTierConfig(tier);
          const count = groupedByTier[tier]?.length || 0;
          const value = groupedByTier[tier]?.reduce((sum, s) => sum + (s.annual_value || 0), 0) || 0;
          return (
            <GlassCard key={tier}>
              <GlassCardContent className="p-4">
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r ${config.color} text-white text-xs font-medium mb-2`}>
                  {config.label}
                </div>
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-sm text-gray-500">€{value.toLocaleString()}/year</p>
              </GlassCardContent>
            </GlassCard>
          );
        })}
      </div>

      {/* Sponsors List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : sponsors.length === 0 ? (
        <GlassCard>
          <GlassCardContent className="p-12 text-center">
            <Megaphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No sponsors yet</h3>
            <p className="text-gray-500 mb-4">Start building your sponsor relationships</p>
            {isClubAdmin && (
              <Button onClick={() => { resetForm(); setShowAddModal(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Sponsor
              </Button>
            )}
          </GlassCardContent>
        </GlassCard>
      ) : (
        <div className="space-y-6">
          {tierOrder.filter(tier => groupedByTier[tier]?.length > 0).map(tier => {
            const config = getTierConfig(tier);
            return (
              <div key={tier}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${config.color}`} />
                  <h2 className="text-lg font-semibold text-gray-900">{config.label} Sponsors</h2>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedByTier[tier].map((sponsor, index) => (
                    <motion.div
                      key={sponsor.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <GlassCard 
                        className="h-full cursor-pointer" 
                        onClick={() => openEditModal(sponsor)}
                      >
                        <GlassCardContent className="p-5">
                          <div className="flex items-start gap-4 mb-4">
                            {sponsor.logo_url ? (
                              <img 
                                src={sponsor.logo_url} 
                                alt={sponsor.name} 
                                className="w-16 h-16 rounded-xl object-contain bg-gray-50 p-2"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center">
                                <Building2 className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{sponsor.name}</h3>
                              <Badge variant="secondary" className={getStatusColor(sponsor.status)}>
                                {sponsor.status || 'active'}
                              </Badge>
                            </div>
                          </div>

                          <div className="space-y-2 text-sm mb-4">
                            {sponsor.annual_value > 0 && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <DollarSign className="w-4 h-4 text-gray-400" />
                                <span>€{sponsor.annual_value.toLocaleString()}/year</span>
                              </div>
                            )}
                            {sponsor.sponsorship_type && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Megaphone className="w-4 h-4 text-gray-400" />
                                <span className="capitalize">{sponsor.sponsorship_type.replace('_', ' ')}</span>
                              </div>
                            )}
                            {sponsor.end_date && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span>Expires {format(parseISO(sponsor.end_date), 'MMM d, yyyy')}</span>
                              </div>
                            )}
                          </div>

                          {/* Digital Placements */}
                          {(sponsor.display_on_loading_screen || sponsor.display_on_match_graphics) && (
                            <div className="flex gap-2">
                              {sponsor.display_on_loading_screen && (
                                <Badge variant="outline" className="text-xs">
                                  <Tv className="w-3 h-3 mr-1" />
                                  Loading Screen
                                </Badge>
                              )}
                              {sponsor.display_on_match_graphics && (
                                <Badge variant="outline" className="text-xs">
                                  <Layout className="w-3 h-3 mr-1" />
                                  Match Graphics
                                </Badge>
                              )}
                            </div>
                          )}

                          {sponsor.website && (
                            <Button 
                              variant="link" 
                              className="p-0 h-auto mt-3"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(sponsor.website, '_blank');
                              }}
                            >
                              <Globe className="w-3 h-3 mr-1" />
                              Visit Website
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                          )}
                        </GlassCardContent>
                      </GlassCard>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Sponsor Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSponsor ? 'Edit Sponsor' : 'Add New Sponsor'}</DialogTitle>
            <DialogDescription>
              Manage sponsor information and digital placements
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Sponsor Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Company name"
              />
            </div>

            <div>
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input
                id="logo_url"
                value={formData.logo_url}
                onChange={(e) => setFormData({...formData, logo_url: e.target.value})}
                placeholder="https://..."
              />
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => setFormData({...formData, website: e.target.value})}
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tier">Tier</Label>
                <Select value={formData.tier} onValueChange={(v) => setFormData({...formData, tier: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="platinum">Platinum</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="bronze">Bronze</SelectItem>
                    <SelectItem value="community">Community</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="sponsorship_type">Type</Label>
                <Select value={formData.sponsorship_type} onValueChange={(v) => setFormData({...formData, sponsorship_type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kit">Kit Sponsor</SelectItem>
                    <SelectItem value="pitch_side">Pitch Side</SelectItem>
                    <SelectItem value="match_ball">Match Ball</SelectItem>
                    <SelectItem value="program">Program</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="annual_value">Annual Value (€)</Label>
              <Input
                id="annual_value"
                type="number"
                min="0"
                value={formData.annual_value}
                onChange={(e) => setFormData({...formData, annual_value: parseFloat(e.target.value) || 0})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Start Date</Label>
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

            <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
              <h4 className="font-medium text-gray-900">Digital Inventory Placements</h4>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tv className="w-4 h-4 text-gray-500" />
                  <Label htmlFor="loading_screen" className="font-normal">App Loading Screen</Label>
                </div>
                <Switch
                  id="loading_screen"
                  checked={formData.display_on_loading_screen}
                  onCheckedChange={(v) => setFormData({...formData, display_on_loading_screen: v})}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layout className="w-4 h-4 text-gray-500" />
                  <Label htmlFor="match_graphics" className="font-normal">Match Result Graphics</Label>
                </div>
                <Switch
                  id="match_graphics"
                  checked={formData.display_on_match_graphics}
                  onCheckedChange={(v) => setFormData({...formData, display_on_match_graphics: v})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="contact_name">Contact Name</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                placeholder="Primary contact"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || !formData.name}
              className="bg-gradient-to-r from-blue-500 to-indigo-600"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {selectedSponsor ? 'Update Sponsor' : 'Add Sponsor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}