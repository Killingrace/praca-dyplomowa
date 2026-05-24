import { useState, useRef, useEffect } from 'react';
import { Terminal, Settings as SettingsIcon, Plus, MessageSquare, Trash2, Edit2, Check, X as XIcon } from 'lucide-react';
import ChatMessage from './components/ChatMessage';
import CommandProposal from './components/CommandProposal';
import ChatInput from './components/ChatInput';
import Settings, { SettingsData } from './components/Settings';

export interface Message {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  commands?: string[];
}

export interface ChatSummary {
  id: string;
  summary: string;
}

function App() {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [settings, setSettingsState] = useState<SettingsData>({ api_key: '', base_url: '', model: 'gpt-4o-2024-08-06' });
  const [showSettings, setShowSettings] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [settingsRes, chatsRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/chats')
        ]);
        
        if (settingsRes.ok) {
          const loadedSettings = await settingsRes.json();
          setSettingsState(loadedSettings);
          if (!loadedSettings.api_key) {
            setShowSettings(true);
          }
        }
        
        if (chatsRes.ok) {
          const data = await chatsRes.json();
          setChats(data.chats);
          if (data.chats.length > 0) {
            setCurrentChatId(data.chats[data.chats.length - 1].id); // Select latest
          }
        }
      } catch (e) {
        console.error("Failed to load initial data", e);
        setShowSettings(true);
      } finally {
        setIsLoaded(true);
      }
    };
    
    loadData();
  }, []);

  // Load chat history when currentChatId changes
  useEffect(() => {
    if (!currentChatId) {
      setMessages([]);
      return;
    }
    
    const loadHistory = async () => {
      try {
        const res = await fetch(`/api/chat/${currentChatId}/history`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages);
        }
      } catch (e) {
        console.error("Failed to load history for chat", e);
      }
    };
    
    loadHistory();
  }, [currentChatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking, isExecuting]);

  if (!isLoaded) return <div className="p-10 text-center text-terminal-dim text-xl">Initializing system...</div>;

  const refreshChats = async () => {
    try {
      const res = await fetch('/api/chats');
      if (res.ok) {
        const data = await res.json();
        setChats(data.chats);
      }
    } catch(e) {}
  };

  const handleNewChat = async () => {
    try {
      const res = await fetch('/api/chats', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setChats([...chats, { id: data.chat_id, summary: data.summary }]);
        setCurrentChatId(data.chat_id);
      }
    } catch(e) {
      console.error("Failed to create chat", e);
    }
  };

  const handleDeleteChat = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Delete this chat?")) return;
    try {
      const res = await fetch(`/api/chat/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const updated = chats.filter(c => c.id !== id);
        setChats(updated);
        if (currentChatId === id) {
          setCurrentChatId(updated.length > 0 ? updated[updated.length - 1].id : null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startRenameChat = (e: React.MouseEvent, chat: ChatSummary) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditingTitle(chat.summary);
  };

  const handleRenameSubmit = async (id: string) => {
    try {
      const res = await fetch(`/api/chat/${id}/summary`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: editingTitle })
      });
      if (res.ok) {
        setChats(chats.map(c => c.id === id ? { ...c, summary: editingTitle } : c));
      }
    } catch (err) {
      console.error(err);
    }
    setEditingChatId(null);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !settings.api_key) return;
    
    let targetChatId = currentChatId;
    if (!targetChatId) {
      try {
        const res = await fetch('/api/chats', { method: 'POST' });
        const data = await res.json();
        targetChatId = data.chat_id;
        setCurrentChatId(targetChatId);
      } catch (e) {
        return;
      }
    }

    const newMessage: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, newMessage]);
    setIsThinking(true);

    try {
      const res = await fetch(`/api/chat/${targetChatId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'agent',
        content: data.message,
        commands: data.proposed_commands
      }]);
      
      refreshChats();
    } catch (err: any) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'system', content: `Error: ${err.message}` }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleExecuteCommands = (commands: string[]) => {
    if (!currentChatId) return;
    setIsExecuting(true);
    setIsAnalyzing(false);
    
    const logMessageId = Date.now().toString();
    setMessages(prev => [...prev, { id: logMessageId, role: 'system', content: '' }]);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || '127.0.0.1:8000';
    const wsUrl = `${protocol}//${host}/ws/execute/${currentChatId}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ commands }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'output' || data.type === 'status' || data.type === 'error') {
        setMessages(prev => prev.map(msg => {
          if (msg.id === logMessageId) {
            let newContent = msg.content + (data.type === 'output' ? data.content : `\n[${data.content}]\n`);
            // Handle carriage returns (progress bars) by replacing everything on the line before \r
            newContent = newContent.replace(/[^\n]*\r(?!\n)/g, '');
            return { ...msg, content: newContent };
          }
          return msg;
        }));
        
        if (data.type === 'status' && data.content === 'Analyzing logs...') {
          setIsAnalyzing(true);
        }
      } else if (data.type === 'analysis') {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'agent',
          content: data.content.message,
          commands: data.content.proposed_commands
        }]);
      }
    };

    ws.onclose = () => {
      setIsExecuting(false);
      setIsAnalyzing(false);
      wsRef.current = null;
    };
  };

  const handleSendInputToProcess = (input: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'input', content: input }));
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg.role === 'system') {
          return [...prev.slice(0, -1), { ...lastMsg, content: lastMsg.content + input + '\n' }];
        }
        return prev;
      });
    }
  };

  const handleSendSigint = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'sigint' }));
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg.role === 'system') {
          return [...prev.slice(0, -1), { ...lastMsg, content: lastMsg.content + '^C\n' }];
        }
        return prev;
      });
    }
  };

  const handleSaveSettings = async (newSettings: SettingsData) => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      setSettingsState(newSettings);
      setShowSettings(false);
    } catch (e) {
      console.error("Failed to save settings", e);
    }
  };

  return (
    <div className="flex h-screen w-full bg-black text-terminal-text overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-64 border-r border-terminal-dim flex flex-col p-4 bg-black z-10">
        <div className="flex items-center gap-2 text-xl font-bold mb-6 text-terminal-accent">
          <Terminal />
          <span>SysAdmin AI</span>
        </div>
        
        <button 
          onClick={handleNewChat}
          className="flex items-center gap-2 border border-terminal-accent text-terminal-accent p-2 rounded hover:bg-terminal-accent/10 transition-colors mb-4 w-full"
        >
          <Plus size={18} /> New Chat
        </button>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {chats.map(chat => (
            <div
              key={chat.id}
              onClick={() => setCurrentChatId(chat.id)}
              className={`group flex items-center justify-between w-full p-2 rounded transition-colors text-sm cursor-pointer ${
                currentChatId === chat.id ? 'bg-terminal-accent/20 text-terminal-accent' : 'hover:bg-terminal-dim/20'
              }`}
            >
              {editingChatId === chat.id ? (
                <div className="flex items-center w-full gap-1" onClick={e => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={e => setEditingTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRenameSubmit(chat.id);
                      if (e.key === 'Escape') setEditingChatId(null);
                    }}
                    autoFocus
                    className="flex-1 bg-black border border-terminal-dim focus:border-terminal-accent text-xs p-1 outline-none rounded"
                  />
                  <button onClick={() => handleRenameSubmit(chat.id)} className="text-green-500 hover:text-green-400 p-1"><Check size={14} /></button>
                  <button onClick={() => setEditingChatId(null)} className="text-red-500 hover:text-red-400 p-1"><XIcon size={14} /></button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 truncate overflow-hidden">
                    <MessageSquare size={16} className="shrink-0" />
                    <span className="truncate">{chat.summary}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                    <button onClick={(e) => startRenameChat(e, chat)} className="p-1 hover:text-white" title="Rename"><Edit2 size={14} /></button>
                    <button onClick={(e) => handleDeleteChat(e, chat.id)} className="p-1 hover:text-red-500" title="Delete"><Trash2 size={14} /></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <button 
          onClick={() => setShowSettings(true)} 
          className="flex items-center gap-2 mt-4 p-2 hover:bg-terminal-dim/20 rounded text-sm w-full"
        >
          <SettingsIcon size={18} /> Settings
        </button>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative max-w-5xl mx-auto w-full p-4 h-full">
        {showSettings && (
          <Settings initialSettings={settings} onSave={handleSaveSettings} onClose={() => setShowSettings(false)} />
        )}

        <div className="flex-1 overflow-y-auto mb-4 border border-terminal-dim/30 p-4 rounded flex flex-col gap-4">
          {messages.length === 0 && (
            <div className="text-center text-terminal-dim mt-10">
              System ready. Describe your issue...
            </div>
          )}
          
          {messages.map((msg) => (
            <div key={msg.id} className="flex flex-col gap-2">
              <ChatMessage message={msg} />
              {msg.role === 'agent' && msg.commands && msg.commands.length > 0 && (
                <CommandProposal 
                  commands={msg.commands} 
                  onExecute={() => handleExecuteCommands(msg.commands!)}
                  disabled={isExecuting || isThinking}
                />
              )}
            </div>
          ))}
          {isThinking && <div className="text-terminal-dim animate-pulse">Agent is thinking...</div>}
          <div ref={messagesEndRef} />
        </div>

        {/* Dedicated Terminal Input box when executing */}
        {(isExecuting && !isAnalyzing) && (
          <div className="mb-4 bg-black border border-orange-500/50 rounded-lg p-3 shadow-[0_0_15px_rgba(249,115,22,0.15)] flex gap-2 items-center transition-all animate-pulse-glow">
            <span className="text-orange-500 font-bold whitespace-nowrap">&gt;_ Terminal Input:</span>
            <input 
              type="text"
              className="flex-1 bg-transparent border-b border-orange-500/30 focus:border-orange-500 outline-none text-orange-200 px-2 py-1 placeholder:text-orange-500/40 font-mono text-sm"
              placeholder="Enter password or prompt reply here and press Enter..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSendInputToProcess(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
              autoFocus
            />
            <button 
              onClick={handleSendSigint}
              className="bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-black border border-red-500/50 px-3 py-1 rounded text-xs font-bold transition-colors"
              title="Send Ctrl+C to terminate the current process"
            >
              Ctrl+C
            </button>
          </div>
        )}

        <ChatInput 
          onSend={handleSendMessage} 
          disabled={isThinking || !settings.api_key || isExecuting} 
          placeholder={isExecuting ? "Wait for command execution to finish before chatting..." : "Describe the problem or refine commands..."}
        />
      </main>

      <style>{`
        .animate-pulse-glow {
          animation: pulse-border 2s infinite;
        }
        @keyframes pulse-border {
          0%, 100% { border-color: rgba(249,115,22,0.3); }
          50% { border-color: rgba(249,115,22,0.8); }
        }
      `}</style>
    </div>
  );
}

export default App;
