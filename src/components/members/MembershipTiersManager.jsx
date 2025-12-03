import React, { useState, useEffect } from 'react';
import { useClub } from '@/components/ClubContext';
import { base44 } from '@/api/base44Client';
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';
import {
  Crown, Plus, Edit2, Trash2, Check, Loader2, DollarSign, 
  Calendar, Users, Gift, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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

export default function MembershipTiersManager() {
  const { currentClub, isClubAdmin } = useClub();
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    billing_period: 'annual',
    benefits: [],
    includes_training: true,
    includes_matches: true,
    includes_social_events: false,
    includes_lotto: false,
    color: '#2563eb',
    required_documents: []
  });
  const [saving, setSaving] = useState(false);
  const [newBenefit, setNewBenefit] = useState('');

  useEffect(() => {
    if (currentClub?.id) {
      loadTiers();
    }
  }, [currentClub?.id]);

  const loadTiers = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.MembershipTier.filter({ club_id: currentClub.id });
      setTiers(data.sort((a, b) => (b.price || 0) - (a.price || 0)));
    } catch (error) {
      console.error('Error loading tiers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const tierData = {
        ...formData,
        club_id: currentClub.id,
        slug: formData.name.toLowerCase().replace(/\s+/g, '-')
      };

      if (selectedTier) {
        await base44.entities.MembershipTier.update(selectedTier.id, tierData);
      } else {
        await base44.entities.MembershipTier.create(tierData);
      }

      await loadTiers();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving tier:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tier) => {
    if (!confirm(`Delete "${tier.name}" tier?`)) return;
    try {
      await base44.entities.MembershipTier.delete(tier.id);
      await loadTiers();
    } catch (error) {
      console.error('Error deleting tier:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      billing_period: 'annual',
      benefits: [],
      includes_training: true,
      includes_matches: true,
      includes_social_events: false,
      includes_lotto: false,
      color: '#2563eb',
      required_documents: []
    });
    setSelectedTier(null);
    setNewBenefit('');
  };

  const openEditModal = (tier) => {
    setSelectedTier(tier);
    setFormData({
      name: tier.name || '',
      description: tier.description || '',
      price: tier.price || 0,
      billing_period: tier.billing_period || 'annual',
      benefits: tier.benefits || [],
      includes_training: tier.includes_training ?? true,
      includes_matches: tier.includes_matches ?? true,
      includes_social_events: tier.includes_social_events || false,
      includes_lotto: tier.includes_lotto || false,
      color: tier.color || '#2563eb',
      required_documents: tier.required_documents || []
    });
    setShowModal(true);
  };

  const addBenefit = () => {
    if (newBenefit.trim()) {
      setFormData({
        ...formData,
        benefits: [...formData.benefits, newBenefit.trim()]
      });
      setNewBenefit('');
    }
  };

  const removeBenefit = (index) => {
    setFormData({
      ...formData,
      benefits: formData.benefits.filter((_, i) => i !== index)
    });
  };

  const getBillingLabel = (period) => {
    const labels = {
      monthly: '/month',
      quarterly: '/quarter',
      annual: '/year',
      one_time: 'one-time'
    };
    return labels[period] || '';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Membership Tiers</h3>
        {isClubAdmin && (
          <Button onClick={() => { resetForm(); setShowModal(true); }} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Add Tier
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      ) : tiers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Crown className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>No membership tiers created</p>
          <Button variant="link" onClick={() => setShowModal(true)}>Create your first tier</Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiers.map((tier, index) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <GlassCard className="h-full relative overflow-hidden">
                <div 
                  className="absolute top-0 left-0 right-0 h-2"
                  style={{ backgroundColor: tier.color || '#2563eb' }}
                />
                <GlassCardContent className="pt-6 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{tier.name}</h4>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-bold text-gray-900">€{tier.price}</span>
                        <span className="text-sm text-gray-500">{getBillingLabel(tier.billing_period)}</span>
                      </div>
                    </div>
                    {isClubAdmin && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditModal(tier)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(tier)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {tier.description && (
                    <p className="text-sm text-gray-500 mb-3">{tier.description}</p>
                  )}

                  <div className="space-y-2 mb-4">
                    {tier.includes_training && (
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>Training sessions</span>
                      </div>
                    )}
                    {tier.includes_matches && (
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>Match participation</span>
                      </div>
                    )}
                    {tier.includes_social_events && (
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>Social events</span>
                      </div>
                    )}
                    {tier.includes_lotto && (
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>Club lotto entry</span>
                      </div>
                    )}
                  </div>

                  {tier.benefits?.length > 0 && (
                    <div className="pt-3 border-t">
                      {tier.benefits.slice(0, 3).map((benefit, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                          <Gift className="w-3 h-3 text-gray-400" />
                          <span>{benefit}</span>
                        </div>
                      ))}
                      {tier.benefits.length > 3 && (
                        <p className="text-xs text-gray-400 mt-1">+{tier.benefits.length - 3} more</p>
                      )}
                    </div>
                  )}
                </GlassCardContent>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Tier Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTier ? 'Edit Tier' : 'Create Membership Tier'}</DialogTitle>
            <DialogDescription>
              Define a membership package with pricing and benefits
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Tier Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Gold Membership"
                />
              </div>
              <div>
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                  className="h-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Brief description of this tier..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Price (€)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label htmlFor="billing_period">Billing Period</Label>
                <Select value={formData.billing_period} onValueChange={(v) => setFormData({...formData, billing_period: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="one_time">One-time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
              <h4 className="font-medium text-gray-900">Included Features</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between">
                  <Label className="font-normal">Training sessions</Label>
                  <Switch
                    checked={formData.includes_training}
                    onCheckedChange={(v) => setFormData({...formData, includes_training: v})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="font-normal">Match participation</Label>
                  <Switch
                    checked={formData.includes_matches}
                    onCheckedChange={(v) => setFormData({...formData, includes_matches: v})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="font-normal">Social events</Label>
                  <Switch
                    checked={formData.includes_social_events}
                    onCheckedChange={(v) => setFormData({...formData, includes_social_events: v})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="font-normal">Club lotto</Label>
                  <Switch
                    checked={formData.includes_lotto}
                    onCheckedChange={(v) => setFormData({...formData, includes_lotto: v})}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Additional Benefits</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newBenefit}
                  onChange={(e) => setNewBenefit(e.target.value)}
                  placeholder="Add a benefit..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                />
                <Button type="button" variant="outline" onClick={addBenefit}>Add</Button>
              </div>
              {formData.benefits.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.benefits.map((benefit, index) => (
                    <Badge key={index} variant="secondary" className="pr-1">
                      {benefit}
                      <button
                        onClick={() => removeBenefit(index)}
                        className="ml-2 hover:text-red-500"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || !formData.name}
              className="bg-gradient-to-r from-blue-500 to-indigo-600"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {selectedTier ? 'Update Tier' : 'Create Tier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}