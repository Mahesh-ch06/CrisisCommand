
import React from 'react';
import { RecommendedAction, ActionPriority } from '../types';
import { ShieldAlert, Clock, Info } from 'lucide-react';

const RecommendationCard: React.FC<{ action: RecommendedAction }> = ({ action }) => {
  const isImmediate = action.priority === ActionPriority.IMMEDIATE;

  return (
    <div className={`p-4 rounded-lg border flex flex-col space-y-2 transition-all hover:bg-slate-800/80 ${
      isImmediate ? 'border-red-900 bg-red-950/20' : 'border-slate-800 bg-slate-900/40'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldAlert className={`w-4 h-4 ${isImmediate ? 'text-red-500' : 'text-slate-400'}`} />
          <span className="font-bold text-sm text-slate-200">{action.action.replace('_', ' ')}</span>
        </div>
        <div className={`flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
          isImmediate ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-300'
        }`}>
          {isImmediate ? 'IMMEDIATE' : 'DEFERRED'}
        </div>
      </div>
      <p className="text-sm text-slate-400 leading-tight">
        {action.details}
      </p>
    </div>
  );
};

export default RecommendationCard;
