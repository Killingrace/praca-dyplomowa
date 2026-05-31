import { useState } from 'react';
import { ChevronDown, ChevronRight, Play } from 'lucide-react';

interface Props {
  commands: string[];
  onExecute: () => void;
  disabled: boolean;
}

export default function CommandProposal({ commands, onExecute, disabled }: Props) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border border-chat-accent/20 bg-chat-bg rounded-2xl overflow-hidden ml-14 mr-8 mt-2 shadow-sm transition-all duration-300">
      <div 
        className="flex justify-between items-center bg-chat-accent/5 p-3 cursor-pointer hover:bg-chat-accent/10 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 text-sm font-bold text-chat-accent">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          Proposed Commands ({commands.length})
        </div>
      </div>
      
      {expanded && (
        <div className="p-4 flex flex-col gap-4">
          <div className="bg-black/50 p-4 rounded-xl font-mono text-sm border border-white/5">
            {commands.map((cmd, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-chat-text-secondary select-none opacity-50">$</span>
                <span className="text-chat-text-primary">{cmd}</span>
              </div>
            ))}
          </div>
          
          <button
            onClick={onExecute}
            disabled={disabled}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl font-bold uppercase tracking-wider transition-all duration-300
              ${disabled 
                ? 'bg-chat-surface text-chat-text-secondary cursor-not-allowed' 
                : 'bg-chat-accent/20 text-chat-accent hover:bg-chat-accent hover:text-white shadow-md'
              }`}
          >
            <Play size={18} />
            {disabled ? 'Processing...' : 'Execute Commands'}
          </button>
        </div>
      )}
    </div>
  );
}
