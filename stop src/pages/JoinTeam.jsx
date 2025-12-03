import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';
import {
  Shield, Users, CheckCircle, Plus, Loader2, UserPlus, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

export default function JoinTeam() {
  const [team, setTeam] = useState(null);
  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    requester_name: '',
    requester_email: '',
    requester_phone: '',
    relationship: 'parent',
    player_first_name: '',
    player_last_name: '',
    player_dob: '',
    has_additional_children: false,
    additional_children: []
  });

  useEffect(() => {
    loadTeam();
  }, []);

  const loadTeam = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      if (code) {
        const teams = await base44.entities.Team.filter({ join_code: code });
        if (teams.length > 0) {
          setTeam(teams[0]);
          const clubs = await base44.entities.Club.filter({ id: teams[0].club_id });
          if (clubs.length > 0) {
            setClub(clubs[0]);
          }
        }
      }
    } catch (error) {
      console.error('Error loading team:', error);
    } finally {
      setLoading(false);
    }
  };

  const addChild = () => {
    setFormData({
      ...formData,
      additional_children: [
        ...formData.additional_children,
        { first_name: '', last_name: '', dob: '' }
      ]
    });
  };

  const updateChild = (index, field, value) => {
    const children = [...formData.additional_children];
    children[index] = { ...children[index], [field]: value };
    setFormData({ ...formData, additional_children: children });
  };

  const removeChild = (index) => {
    const children = formData.additional_children.filter((_, i) => i !== index);
    setFormData({ ...formData, additional_children: children });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const requestData = {
        club_id: club.id,
        team_id: team.id,
        team_name: team.name,
        join_code: team.join_code,
        ...formData,
        status: 'pending'
      };

      await base44.entities.JoinRequest.create(requestData);
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting request:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard>
          <GlassCardContent className="p-12 text-center">
            <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Join Link</h2>
            <p className="text-gray-500">This team invitation link is invalid or has expired.</p>
          </GlassCardContent>
        </GlassCard>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <GlassCard>
            <GlassCardContent className="p-12 text-center max-w-md">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
              <p className="text-gray-500 mb-4">
                Your request to join {team.name} has been sent to the team coaches. 
                You'll receive an email once your request is approved.
              </p>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-600">
                  <strong>Club:</strong> {club?.name}<br />
                  <strong>Team:</strong> {team.name}
                </p>
              </div>
            </GlassCardContent>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          {club?.logo_url ? (
            <img src={club.logo_url} alt="" className="w-20 h-20 rounded-2xl mx-auto mb-4 object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">{club?.name?.[0]}</span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">Join {team.name}</h1>
          <p className="text-gray-500 mt-1">{club?.name}</p>
        </motion.div>

        {/* Form */}
        <GlassCard>
          <GlassCardContent className="p-6">
            {/* Progress */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    s === step 
                      ? 'bg-blue-600 text-white' 
                      : s < step 
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {s < step ? <CheckCircle className="w-4 h-4" /> : s}
                </div>
              ))}
            </div>

            {/* Step 1: Your Details */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Details</h3>
                
                <div>
                  <Label htmlFor="requester_name">Your Full Name *</Label>
                  <Input
                    id="requester_name"
                    value={formData.requester_name}
                    onChange={(e) => setFormData({...formData, requester_name: e.target.value})}
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <Label htmlFor="requester_email">Email Address *</Label>
                  <Input
                    id="requester_email"
                    type="email"
                    value={formData.requester_email}
                    onChange={(e) => setFormData({...formData, requester_email: e.target.value})}
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="requester_phone">Phone Number</Label>
                  <Input
                    id="requester_phone"
                    value={formData.requester_phone}
                    onChange={(e) => setFormData({...formData, requester_phone: e.target.value})}
                    placeholder="+353 12 345 6789"
                  />
                </div>

                <div>
                  <Label htmlFor="relationship">You are...</Label>
                  <Select value={formData.relationship} onValueChange={(v) => setFormData({...formData, relationship: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="self">A player joining myself</SelectItem>
                      <SelectItem value="parent">A parent/guardian</SelectItem>
                      <SelectItem value="guardian">Legal guardian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600"
                  onClick={() => setStep(2)}
                  disabled={!formData.requester_name || !formData.requester_email}
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            )}

            {/* Step 2: Player Details */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {formData.relationship === 'self' ? 'Your Details' : 'Player Details'}
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="player_first_name">First Name *</Label>
                    <Input
                      id="player_first_name"
                      value={formData.player_first_name}
                      onChange={(e) => setFormData({...formData, player_first_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="player_last_name">Last Name *</Label>
                    <Input
                      id="player_last_name"
                      value={formData.player_last_name}
                      onChange={(e) => setFormData({...formData, player_last_name: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="player_dob">Date of Birth *</Label>
                  <Input
                    id="player_dob"
                    type="date"
                    value={formData.player_dob}
                    onChange={(e) => setFormData({...formData, player_dob: e.target.value})}
                  />
                </div>

                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                    Back
                  </Button>
                  <Button 
                    className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600"
                    onClick={() => setStep(3)}
                    disabled={!formData.player_first_name || !formData.player_last_name || !formData.player_dob}
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Additional Children */}
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Players</h3>
                
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-800">Family Registration</p>
                      <p className="text-blue-700 mt-1">
                        Do you have other children to register? Add them now to link them to your account for easy management.
                      </p>
                    </div>
                  </div>
                </div>

                {formData.additional_children.map((child, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">Child {index + 2}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-500 h-auto p-1"
                        onClick={() => removeChild(index)}
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="First name"
                        value={child.first_name}
                        onChange={(e) => updateChild(index, 'first_name', e.target.value)}
                      />
                      <Input
                        placeholder="Last name"
                        value={child.last_name}
                        onChange={(e) => updateChild(index, 'last_name', e.target.value)}
                      />
                    </div>
                    <Input
                      type="date"
                      value={child.dob}
                      onChange={(e) => updateChild(index, 'dob', e.target.value)}
                    />
                  </div>
                ))}

                <Button variant="outline" onClick={addChild} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Child
                </Button>

                <div className="flex gap-4 pt-4">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                    Back
                  </Button>
                  <Button 
                    className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <UserPlus className="w-4 h-4 mr-2" />
                    )}
                    Submit Request
                  </Button>
                </div>
              </motion.div>
            )}
          </GlassCardContent>
        </GlassCard>
      </div>
    </div>
  );
}