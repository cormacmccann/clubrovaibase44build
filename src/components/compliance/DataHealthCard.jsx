import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, TrendingUp } from 'lucide-react';
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard';
import { Progress } from '@/components/ui/progress';

export default function DataHealthCard({ 
  healthScore, 
  totalMembers, 
  compliantMembers, 
  criticalIssues, 
  warningIssues 
}) {
  const getHealthColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  const getHealthBg = (score) => {
    if (score >= 90) return 'from-green-500 to-emerald-600';
    if (score >= 70) return 'from-amber-500 to-orange-600';
    return 'from-red-500 to-rose-600';
  };

  const getHealthLabel = (score) => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Needs Attention';
    return 'Critical';
  };

  return (
    <div className="grid md:grid-cols-4 gap-4 mb-6">
      {/* Main Health Score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="md:col-span-2"
      >
        <GlassCard className="h-full">
          <GlassCardContent className="p-6">
            <div className="flex items-center gap-6">
              <div className={`relative w-28 h-28 rounded-full bg-gradient-to-br ${getHealthBg(healthScore)} p-1`}>
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                  <div className="text-center">
                    <span className={`text-3xl font-bold ${getHealthColor(healthScore)}`}>
                      {healthScore}%
                    </span>
                    <p className="text-xs text-gray-500">Health</p>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Data Health Score</h3>
                <p className={`text-sm font-medium ${getHealthColor(healthScore)} mb-3`}>
                  {getHealthLabel(healthScore)}
                </p>
                <Progress value={healthScore} className="h-2" />
                <p className="text-sm text-gray-500 mt-2">
                  {compliantMembers} of {totalMembers} members are fully compliant
                </p>
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>
      </motion.div>

      {/* Critical Issues */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <GlassCard className="h-full">
          <GlassCardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Critical Issues</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{criticalIssues}</p>
                <p className="text-xs text-gray-500 mt-1">Members with errors</p>
              </div>
              <div className="p-3 rounded-xl bg-red-100">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>
      </motion.div>

      {/* Warnings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <GlassCard className="h-full">
          <GlassCardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Warnings</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{warningIssues}</p>
                <p className="text-xs text-gray-500 mt-1">Members with warnings</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-100">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>
      </motion.div>
    </div>
  );
}