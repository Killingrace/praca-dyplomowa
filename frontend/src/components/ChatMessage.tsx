import { Message } from '../App';
import { User, Cpu } from 'lucide-react';

export default function ChatMessage({ message }: { message: Message }) {
  if (message.role === 'system') {
    return (
      <div className="bg-black border border-terminal-dim/50 p-3 rounded font-mono text-sm whitespace-pre-wrap overflow-x-auto my-2">
        {message.content}
      </div>
    );
  }

  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 p-3 rounded ${isUser ? 'bg-terminal-dim/10 ml-8' : 'bg-transparent mr-8'}`}>
      <div className={`mt-1 flex-shrink-0 ${isUser ? 'text-blue-400' : 'text-terminal-accent'}`}>
        {isUser ? <User size={20} /> : <Cpu size={20} />}
      </div>
      <div className="flex-1 whitespace-pre-wrap break-words leading-relaxed">
        {message.content}
      </div>
    </div>
  );
}
