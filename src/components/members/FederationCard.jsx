import React from 'react';
import { format, parseISO } from 'date-fns';
import { Shield, CheckCircle, Clock, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const NGB_NAMES = {
  gaelic_football: 'GAA',
  hurling: 'GAA',
  camogie: 'Camogie Association',
  lgfa: 'LGFA',
  rugby: 'IRFU',
  football: 'FAI',
  basketball: 'Basketball Ireland',
  hockey: 'Hockey Ireland'
};

export default function FederationCard({ member, sportType }) {
  const federationData = member.federation_data || {};
  const ngbName = NGB_NAMES[sportType] || 'NGB';

  const getStatusConfig = () => {
    switch (federationData.registration_status) {
      case 'registered':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bg: 'bg-green-50 border-green-200',
          label: 'Registered'
        };
      case 'pending':
        return {
          icon: Clock,
          color: 'text-amber-600',
          bg: 'bg-amber-50 border-amber-200',
          label: 'Pending'
        };
      case 'rejected':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bg: 'bg-red-50 border-red-200',
          label: 'Rejected'
        };
      default:
        return {
          icon: AlertTriangle,
          color: 'text-gray-500',
          bg: 'bg-gray-50 border-gray-200',
          label: 'Unregistered'
        };
    }
  };

  const status = getStatusConfig();
  const StatusIcon = status.icon;

  return (
    <div className={`p-4 rounded-xl border ${status.bg}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className={`w-5 h-5 ${status.color}`} />
          <span className="font-semibold text-gray-900">{ngbName} Registration</span>
        </div>
        <Badge className={`${status.color} ${status.bg.replace('bg-', 'bg-').replace('-50', '-100')}`}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {status.label}
        </Badge>
      </div>

      {federationData.ngb_id ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{ngbName} ID</span>
            <span className="font-mono font-medium text-gray-900">{federationData.ngb_id}</span>
          </div>
          
          {federationData.registration_category && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Category</span>
              <span className="text-sm text-gray-900">{federationData.registration_category}</span>
            </div>
          )}
          
          {federationData.season && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Season</span>
              <span className="text-sm text-gray-900">{federationData.season}</span>
            </div>
          )}
          
          {federationData.last_synced_at && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Last Synced</span>
              <span className="text-xs text-gray-500">
                {format(parseISO(federationData.last_synced_at), 'MMM d, yyyy')}
              </span>
            </div>
          )}

          {federationData.sync_errors?.length > 0 && (
            <div className="mt-2 p-2 bg-red-50 rounded-lg">
              <p className="text-xs font-medium text-red-700 mb-1">Sync Errors:</p>
              {federationData.sync_errors.map((err, idx) => (
                <p key={idx} className="text-xs text-red-600">• {err}</p>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-2">
          <p className="text-sm text-gray-500 mb-3">
            Not yet registered with {ngbName}
          </p>
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-3 h-3" />
            Register Now
          </Button>
        </div>
      )}
    </div>
  );
}