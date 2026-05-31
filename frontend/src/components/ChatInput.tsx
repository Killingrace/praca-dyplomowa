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
        className="w-full bg-chat-surface border border-chat-border focus:border-chat-accent focus:ring-1 focus:ring-chat-accent rounded-3xl p-5 pr-14 resize-none outline-none transition-all duration-300 placeholder:text-chat-text-secondary/50 text-chat-text-primary shadow-lg"
        rows={3}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        className={`absolute bottom-5 right-5 p-2 rounded-full transition-all duration-300 ${
          disabled || !text.trim() 
            ? 'text-chat-text-secondary opacity-50 cursor-not-allowed' 
            : 'bg-chat-accent text-white hover:bg-chat-accent-hover shadow-md shadow-chat-accent/20'
        }`}
      >
        <Send size={20} />
      </button>
    </div>
  );
}
