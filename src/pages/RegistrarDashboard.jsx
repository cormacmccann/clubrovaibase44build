import React, { useState, useEffect } from 'react';
import { useClub } from '@/components/ClubContext';
import { base44 } from '@/api/base44Client';
import { GlassCard, GlassCardContent, GlassCardHeader } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';
import { differenceInYears, parseISO, differenceInDays } from 'date-fns';
import {
  Shield, AlertTriangle, CheckCircle, XCircle, Send, Download,
  Users, Search, Filter, RefreshCw, Loader2, FileSpreadsheet,
  Mail, ChevronRight, AlertCircle, Clock, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import DataHealthCard from '@/components/compliance/DataHealthCard';
import MemberComplianceList from '@/components/compliance/MemberComplianceList';
import ExportWizard from '@/components/compliance/ExportWizard';
import VettingTracker from '@/components/compliance/VettingTracker';

export default function RegistrarDashboard() {
  const { currentClub, isClubAdmin } = useClub();
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [vettingRecords, setVettingRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('health');
  const [showExportWizard, setShowExportWizard] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (currentClub?.id) {
      loadData();
    }
  }, [currentClub?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [membersData, teamsData, vettingData] = await Promise.all([
        base44.entities.Member.filter({ club_id: currentClub.id }),
        base44.entities.Team.filter({ club_id: currentClub.id, is_active: true }),
        base44.entities.VettingRecord.filter({ club_id: currentClub.id })
      ]);
      
      // Calculate compliance for each member
      const membersWithCompliance = membersData.map(member => ({
        ...member,
        complianceIssues: calculateComplianceIssues(member)
      }));
      
      setMembers(membersWithCompliance);
      setTeams(teamsData);
      setVettingRecords(vettingData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateComplianceIssues = (member) => {
    const issues = [];
    const sportType = currentClub?.sport_type || 'gaelic_football';
    
    // Core required fields
    if (!member.date_of_birth) {
      issues.push({ field: 'date_of_birth', message: 'Missing Date of Birth', severity: 'error', ngb: 'All' });
    }
    if (!member.address && !member.postal_code) {
      issues.push({ field: 'address', message: 'Missing Address/Postcode', severity: 'error', ngb: 'GAA/LGFA' });
    }
    if (!member.gender) {
      issues.push({ field: 'gender', message: 'Missing Gender', severity: 'error', ngb: 'All' });
    }
    
    // Child-specific requirements
    if (member.member_category === 'child' || (member.date_of_birth && differenceInYears(new Date(), parseISO(member.date_of_birth)) < 18)) {
      if (!member.guardian_id && !member.emergency_contact_name) {
        issues.push({ field: 'guardian', message: 'Missing Guardian/Emergency Contact', severity: 'error', ngb: 'All' });
      }
      if (['rugby', 'irfu'].includes(sportType) && !member.school_name) {
        issues.push({ field: 'school_name', message: 'Missing School Name (Required for Youth Rugby)', severity: 'warning', ngb: 'IRFU' });
      }
    }
    
    // Coach requirements
    if (member.member_type === 'coach') {
      if (!member.email) {
        issues.push({ field: 'email', message: 'Missing Email (Required for Coach Registration)', severity: 'error', ngb: 'All' });
      }
    }
    
    // Federation sync issues
    if (!member.federation_data?.ngb_id) {
      issues.push({ field: 'ngb_id', message: 'Not registered with NGB', severity: 'warning', ngb: currentClub?.sport_type });
    }
    
    return issues;
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTeam = selectedTeam === 'all' || member.teams?.includes(selectedTeam);
    return matchesSearch && matchesTeam;
  });

  const membersWithIssues = filteredMembers.filter(m => m.complianceIssues.length > 0);
  const compliantMembers = filteredMembers.filter(m => m.complianceIssues.length === 0);
  
  const overallHealthScore = members.length > 0 
    ? Math.round((compliantMembers.length / members.length) * 100) 
    : 100;

  const criticalIssues = membersWithIssues.filter(m => 
    m.complianceIssues.some(i => i.severity === 'error')
  ).length;

  const warningIssues = membersWithIssues.filter(m => 
    m.complianceIssues.every(i => i.severity === 'warning')
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Registrar Dashboard</h1>
          <p className="text-gray-500 mt-1">NGB Compliance & Data Health Management</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={loadData} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button 
            onClick={() => setShowExportWizard(true)}
            className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Wizard
          </Button>
        </div>
      </div>

      {/* Data Health Overview */}
      <DataHealthCard 
        healthScore={overallHealthScore}
        totalMembers={members.length}
        compliantMembers={compliantMembers.length}
        criticalIssues={criticalIssues}
        warningIssues={warningIssues}
      />

      {/* Filters */}
      <GlassCard className="mb-6">
        <GlassCardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map(team => (
                  <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="health" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Data Issues ({membersWithIssues.length})
          </TabsTrigger>
          <TabsTrigger value="compliant" className="gap-2">
            <CheckCircle className="w-4 h-4" />
            Compliant ({compliantMembers.length})
          </TabsTrigger>
          <TabsTrigger value="vetting" className="gap-2">
            <Shield className="w-4 h-4" />
            Vetting & Safeguarding
          </TabsTrigger>
        </TabsList>

        <TabsContent value="health">
          <MemberComplianceList 
            members={membersWithIssues}
            onRequestInfo={loadData}
            showIssuesOnly
          />
        </TabsContent>

        <TabsContent value="compliant">
          <MemberComplianceList 
            members={compliantMembers}
            onRequestInfo={loadData}
          />
        </TabsContent>

        <TabsContent value="vetting">
          <VettingTracker 
            members={members}
            vettingRecords={vettingRecords}
            teams={teams}
            onUpdate={loadData}
          />
        </TabsContent>
      </Tabs>

      {/* Export Wizard Modal */}
      <Dialog open={showExportWizard} onOpenChange={setShowExportWizard}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Export Wizard</DialogTitle>
            <DialogDescription>
              Export member data formatted for your National Governing Body
            </DialogDescription>
          </DialogHeader>
          <ExportWizard 
            members={members}
            teams={teams}
            club={currentClub}
            onClose={() => setShowExportWizard(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}