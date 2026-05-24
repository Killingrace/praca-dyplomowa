import { useState, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
  placeholder?: string;
}

export default function ChatInput({ onSend, disabled, placeholder = "Type a message..." }: Props) {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim() && !disabled) {
      onSend(text.trim());
      setText('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full bg-terminal-bg border border-terminal-dim focus:border-terminal-accent focus:ring-1 focus:ring-terminal-accent rounded-lg p-4 pr-14 resize-none outline-none transition-all placeholder:text-terminal-dim/50"
        rows={3}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        className={`absolute bottom-4 right-4 p-2 rounded-full transition-colors ${
          disabled || !text.trim() 
            ? 'text-terminal-dim cursor-not-allowed' 
            : 'text-terminal-accent hover:bg-terminal-dim/20'
        }`}
      >
        <Send size={20} />
      </button>
    </div>
  );
}
