import { useState, useEffect } from 'react';
import { Key, X, Link, Cpu, Server } from 'lucide-react';

export interface SettingsData {
  api_key: string;
  base_url: string;
  model: string;
}

interface Props {
  initialSettings: SettingsData;
  onSave: (settings: SettingsData) => void;
  onClose: () => void;
}

const PRESETS = [
  { label: 'Custom', base_url: '', model: '' },
  { label: 'OpenAI (GPT-4o)', base_url: '', model: 'gpt-4o-2024-08-06' },
  { label: 'DeepSeek', base_url: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { label: 'Google Gemini', base_url: 'https://generativelanguage.googleapis.com/v1beta/openai/', model: 'gemini-1.5-pro' },
  { label: 'OpenRouter (Claude 3.5)', base_url: 'https://openrouter.ai/api/v1', model: 'anthropic/claude-3.5-sonnet' },
  { label: 'Groq (Llama 3)', base_url: 'https://api.groq.com/openai/v1', model: 'llama3-8b-8192' },
  { label: 'Ollama (Local)', base_url: 'http://localhost:11434/v1', model: 'llama3' }
];

export default function Settings({ initialSettings, onSave, onClose }: Props) {
  const [settings, setSettings] = useState<SettingsData>(initialSettings);
  const [presetIndex, setPresetIndex] = useState<number>(0);

  useEffect(() => {
    const match = PRESETS.findIndex(
      p => p.base_url === initialSettings.base_url && p.model === initialSettings.model
    );
    if (match !== -1) {
      setPresetIndex(match);
    }
  }, [initialSettings]);

  const handleChange = (field: keyof SettingsData, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setPresetIndex(0);
  };

  const applyPreset = (index: number) => {
    setPresetIndex(index);
    if (index !== 0) {
      setSettings(prev => ({
        ...prev,
        base_url: PRESETS[index].base_url,
        model: PRESETS[index].model
      }));
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-transparent p-4 transition-all duration-300">
      <div className="bg-chat-surface border border-chat-border ring-1 ring-white/10 rounded-2xl p-6 max-w-md w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2 text-chat-text-primary">
            <Key size={20} className="text-chat-accent" /> AI Configuration
          </h2>
          <button onClick={onClose} className="text-chat-text-secondary hover:text-chat-accent transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm mb-2 text-chat-text-secondary flex items-center gap-2 font-medium">
            <Server size={16} /> Provider Preset
          </label>
          <select 
            value={presetIndex}
            onChange={(e) => applyPreset(Number(e.target.value))}
            className="w-full bg-chat-bg border border-chat-border focus:border-chat-accent rounded-xl p-3 outline-none text-chat-text-primary transition-all duration-300 font-mono text-sm"
          >
            {PRESETS.map((p, i) => (
              <option key={i} value={i}>{p.label}</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm mb-2 text-chat-text-secondary flex items-center gap-2 font-medium">
            <Key size={16} /> API Key (Required)
          </label>
          <input 
            type="password" 
            value={settings.api_key}
            onChange={(e) => handleChange('api_key', e.target.value)}
            placeholder="sk-..."
            className="w-full bg-chat-bg border border-chat-border focus:border-chat-accent rounded-xl p-3 outline-none text-chat-text-primary transition-all duration-300 font-mono"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm mb-2 text-chat-text-secondary flex items-center gap-2 font-medium">
            <Link size={16} /> Base URL (Optional)
          </label>
          <input 
            type="text" 
            value={settings.base_url}
            onChange={(e) => handleChange('base_url', e.target.value)}
            placeholder="Leave empty for default OpenAI"
            className="w-full bg-chat-bg border border-chat-border focus:border-chat-accent rounded-xl p-3 outline-none text-chat-text-primary transition-all duration-300 font-mono"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm mb-2 text-chat-text-secondary flex items-center gap-2 font-medium">
            <Cpu size={16} /> Model Name
          </label>
          <input 
            type="text" 
            value={settings.model}
            onChange={(e) => handleChange('model', e.target.value)}
            placeholder="gpt-4o-2024-08-06"
            className="w-full bg-chat-bg border border-chat-border focus:border-chat-accent rounded-xl p-3 outline-none text-chat-text-primary transition-all duration-300 font-mono"
          />
        </div>
        
        <button 
          onClick={() => onSave(settings)}
          className="w-full bg-chat-accent text-white font-bold py-3 rounded-xl hover:bg-chat-accent-hover transition-all duration-300 shadow-lg shadow-chat-accent/20 mt-2"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
