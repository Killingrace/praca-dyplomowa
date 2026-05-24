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
    <div className="border border-terminal-accent/30 bg-terminal-bg/50 rounded overflow-hidden ml-11 mr-8 mt-2">
      <div 
        className="flex justify-between items-center bg-terminal-accent/10 p-2 cursor-pointer hover:bg-terminal-accent/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 text-sm font-bold text-terminal-accent">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          Proposed Commands ({commands.length})
        </div>
      </div>
      
      {expanded && (
        <div className="p-4 flex flex-col gap-4">
          <div className="bg-black p-3 rounded font-mono text-sm border border-terminal-dim/30">
            {commands.map((cmd, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-terminal-dim select-none">$</span>
                <span className="text-gray-200">{cmd}</span>
              </div>
            ))}
          </div>
          
          <button
            onClick={onExecute}
            disabled={disabled}
            className={`flex items-center justify-center gap-2 p-3 rounded font-bold uppercase tracking-wider transition-all
              ${disabled 
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                : 'bg-terminal-accent text-black hover:bg-green-400 hover:shadow-[0_0_15px_rgba(0,255,0,0.4)]'
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
