import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  FileSpreadsheet, Download, ChevronRight, CheckCircle,
  AlertTriangle, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const NGB_PRESETS = {
  gaa_foireann: {
    name: 'GAA/LGFA (Foireann)',
    logo: '🏐',
    headers: ['Surname', 'First Name', 'DOB', 'Gender', 'Address Line 1', 'Address Line 2', 'Town', 'County', 'Eircode', 'Email', 'Phone', 'Guardian Name', 'Guardian Phone'],
    mapping: {
      'Surname': 'last_name',
      'First Name': 'first_name',
      'DOB': (m) => m.date_of_birth ? format(parseISO(m.date_of_birth), 'dd/MM/yyyy') : '',
      'Gender': (m) => m.gender === 'male' ? 'M' : m.gender === 'female' ? 'F' : '',
      'Address Line 1': 'address',
      'Address Line 2': '',
      'Town': 'city',
      'County': 'county',
      'Eircode': 'postal_code',
      'Email': 'email',
      'Phone': 'phone',
      'Guardian Name': 'emergency_contact_name',
      'Guardian Phone': 'emergency_contact_phone'
    },
    dateFormat: 'dd/MM/yyyy',
    requiredFields: ['last_name', 'first_name', 'date_of_birth', 'address', 'county']
  },
  irfu_rugbyconnect: {
    name: 'Rugby (RugbyConnect)',
    logo: '🏉',
    headers: ['First Name', 'Surname', 'Date of Birth', 'Gender', 'Email', 'Mobile', 'Address', 'Town', 'County', 'Postcode', 'School Name', 'Parent/Guardian Name', 'Parent/Guardian Email', 'Parent/Guardian Mobile'],
    mapping: {
      'First Name': 'first_name',
      'Surname': 'last_name',
      'Date of Birth': (m) => m.date_of_birth ? format(parseISO(m.date_of_birth), 'dd-MM-yyyy') : '',
      'Gender': 'gender',
      'Email': 'email',
      'Mobile': 'phone',
      'Address': 'address',
      'Town': 'city',
      'County': 'county',
      'Postcode': 'postal_code',
      'School Name': 'school_name',
      'Parent/Guardian Name': 'emergency_contact_name',
      'Parent/Guardian Email': '',
      'Parent/Guardian Mobile': 'emergency_contact_phone'
    },
    dateFormat: 'dd-MM-yyyy',
    requiredFields: ['first_name', 'last_name', 'date_of_birth', 'email']
  },
  fai_comet: {
    name: 'Soccer (FAI Comet)',
    logo: '⚽',
    headers: ['FirstName', 'LastName', 'DateOfBirth', 'Gender', 'Email', 'Mobile', 'AddressLine1', 'AddressLine2', 'City', 'County', 'PostCode', 'Country'],
    mapping: {
      'FirstName': 'first_name',
      'LastName': 'last_name',
      'DateOfBirth': (m) => m.date_of_birth ? format(parseISO(m.date_of_birth), 'yyyy-MM-dd') : '',
      'Gender': (m) => m.gender === 'male' ? 'Male' : m.gender === 'female' ? 'Female' : 'Other',
      'Email': 'email',
      'Mobile': 'phone',
      'AddressLine1': 'address',
      'AddressLine2': '',
      'City': 'city',
      'County': 'county',
      'PostCode': 'postal_code',
      'Country': (m) => m.country || 'Ireland'
    },
    dateFormat: 'yyyy-MM-dd',
    requiredFields: ['first_name', 'last_name', 'date_of_birth']
  },
  fa_england: {
    name: 'Football (FA England)',
    logo: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    headers: ['First Name', 'Last Name', 'DOB', 'Gender', 'Email Address', 'Phone Number', 'Address 1', 'Address 2', 'City', 'Postcode', 'FAN Number'],
    mapping: {
      'First Name': 'first_name',
      'Last Name': 'last_name',
      'DOB': (m) => m.date_of_birth ? format(parseISO(m.date_of_birth), 'dd/MM/yyyy') : '',
      'Gender': 'gender',
      'Email Address': 'email',
      'Phone Number': 'phone',
      'Address 1': 'address',
      'Address 2': '',
      'City': 'city',
      'Postcode': 'postal_code',
      'FAN Number': (m) => m.federation_data?.ngb_id || ''
    },
    dateFormat: 'dd/MM/yyyy',
    requiredFields: ['first_name', 'last_name', 'date_of_birth', 'postcode']
  }
};

export default function ExportWizard({ members, teams, club, onClose }) {
  const [selectedPreset, setSelectedPreset] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [includeChildren, setIncludeChildren] = useState(true);
  const [includeAdults, setIncludeAdults] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [step, setStep] = useState(1);

  const getFilteredMembers = () => {
    return members.filter(m => {
      if (selectedTeam !== 'all' && !m.teams?.includes(selectedTeam)) return false;
      if (!includeChildren && m.member_category === 'child') return false;
      if (!includeAdults && m.member_category !== 'child') return false;
      return true;
    });
  };

  const getExportReadiness = () => {
    if (!selectedPreset) return { ready: 0, issues: 0, total: 0 };
    
    const preset = NGB_PRESETS[selectedPreset];
    const filtered = getFilteredMembers();
    let ready = 0;
    let issues = 0;

    filtered.forEach(member => {
      const hasAllRequired = preset.requiredFields.every(field => {
        if (typeof field === 'function') return true;
        return member[field] && member[field].toString().trim() !== '';
      });
      if (hasAllRequired) ready++;
      else issues++;
    });

    return { ready, issues, total: filtered.length };
  };

  const generateCSV = () => {
    if (!selectedPreset) return;
    
    setExporting(true);
    const preset = NGB_PRESETS[selectedPreset];
    const filtered = getFilteredMembers();

    // Generate CSV content
    const rows = [preset.headers];
    
    filtered.forEach(member => {
      const row = preset.headers.map(header => {
        const mapping = preset.mapping[header];
        if (!mapping) return '';
        if (typeof mapping === 'function') return mapping(member);
        return member[mapping] || '';
      });
      rows.push(row);
    });

    // Create CSV string
    const csvContent = rows.map(row => 
      row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${club.name}_${preset.name.replace(/[^a-z0-9]/gi, '_')}_Export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    setExporting(false);
    onClose();
  };

  const readiness = getExportReadiness();

  return (
    <div className="space-y-6">
      {step === 1 && (
        <>
          <div>
            <Label className="text-base font-medium">Select NGB Format</Label>
            <p className="text-sm text-gray-500 mb-3">Choose your National Governing Body's required format</p>
            
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(NGB_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => setSelectedPreset(key)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selectedPreset === key 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{preset.logo}</span>
                    <div>
                      <p className="font-medium text-gray-900">{preset.name}</p>
                      <p className="text-xs text-gray-500">{preset.headers.length} columns</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={() => setStep(2)} 
              disabled={!selectedPreset}
              className="gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="space-y-4">
            <div>
              <Label>Filter by Team</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="mt-1">
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

            <div className="space-y-2">
              <Label>Include Members</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <Checkbox 
                    checked={includeChildren} 
                    onCheckedChange={setIncludeChildren}
                  />
                  <span className="text-sm">Children/Youth</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox 
                    checked={includeAdults} 
                    onCheckedChange={setIncludeAdults}
                  />
                  <span className="text-sm">Adults</span>
                </label>
              </div>
            </div>

            {/* Readiness Summary */}
            <div className="p-4 bg-gray-50 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">Export Readiness</span>
                <Badge variant="secondary">{readiness.total} members</Badge>
              </div>
              
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-green-700">{readiness.ready} ready</span>
                </div>
                {readiness.issues > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="text-amber-700">{readiness.issues} with missing data</span>
                  </div>
                )}
              </div>

              {readiness.issues > 0 && (
                <p className="text-xs text-gray-500">
                  Members with missing data will be included but may fail NGB validation
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button 
              onClick={generateCSV}
              disabled={exporting || readiness.total === 0}
              className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Export {readiness.total} Members
            </Button>
          </div>
        </>
      )}
    </div>
  );
}