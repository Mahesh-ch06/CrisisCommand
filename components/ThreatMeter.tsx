
import React from 'react';
import { ThreatLevel } from '../types';

interface ThreatMeterProps {
  level: ThreatLevel;
}

const ThreatMeter: React.FC<ThreatMeterProps> = ({ level }) => {
  const getLevelStyles = () => {
    switch (level) {
      case ThreatLevel.CRITICAL:
        return { color: 'text-red-500', bg: 'bg-red-500', shadow: 'shadow-red-500/50', label: 'CRITICAL' };
      case ThreatLevel.HIGH:
        return { color: 'text-orange-500', bg: 'bg-orange-500', shadow: 'shadow-orange-500/50', label: 'HIGH' };
      case ThreatLevel.MEDIUM:
        return { color: 'text-yellow-500', bg: 'bg-yellow-500', shadow: 'shadow-yellow-500/50', label: 'MEDIUM' };
      default:
        return { color: 'text-emerald-500', bg: 'bg-emerald-500', shadow: 'shadow-emerald-500/50', label: 'LOW' };
    }
  };

  const styles = getLevelStyles();

  return (
    <div className="flex items-center space-x-4 p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
      <div className="flex-1">
        <div className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Global Threat Status</div>
        <div className={`text-2xl font-black ${styles.color} tracking-tighter`}>{styles.label}</div>
      </div>
      <div className="flex space-x-1">
        {[ThreatLevel.LOW, ThreatLevel.MEDIUM, ThreatLevel.HIGH, ThreatLevel.CRITICAL].map((l) => (
          <div
            key={l}
            className={`h-8 w-3 rounded-sm transition-all duration-500 ${
              l === level ? `${styles.bg} ${styles.shadow} shadow-lg scale-y-125` : 'bg-slate-800'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default ThreatMeter;
