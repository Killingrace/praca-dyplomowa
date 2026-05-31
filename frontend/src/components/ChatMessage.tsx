import { Message } from '../App';
import { User, Cpu } from 'lucide-react';

export default function ChatMessage({ message }: { message: Message }) {
  if (message.role === 'system') {
    return (
      <div className="bg-chat-surface text-chat-text-secondary border border-chat-border p-4 rounded-2xl font-mono text-sm whitespace-pre-wrap overflow-x-auto my-2">
        {message.content}
      </div>
    );
  }

  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-4 p-5 rounded-3xl transition-all duration-300 ${isUser ? 'bg-chat-surface border border-chat-border ml-8 shadow-sm' : 'bg-transparent mr-8'}`}>
      <div className={`mt-1 flex-shrink-0 ${isUser ? 'text-chat-accent' : 'text-chat-accent-hover'}`}>
        {isUser ? <User size={20} /> : <Cpu size={20} />}
      </div>
      <div className="flex-1 whitespace-pre-wrap break-words leading-relaxed text-chat-text-primary">
        {message.content}
      </div>
    </div>
  );
}
