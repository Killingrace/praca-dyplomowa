import os
import json
import glob
from typing import List, Optional
from pydantic import BaseModel, Field
from openai import AsyncOpenAI

class AgentResponse(BaseModel):
    message: str = Field(description="The explanation of the situation, analysis of logs, or general response to the user.")
    proposed_commands: List[str] = Field(default_factory=list, description="A list of proposed bash commands to execute on the system to resolve the issue or gather information.")

SYSTEM_PROMPT = """You are an expert Senior Linux System Administrator and AI Architect.
Your role is to help the user debug and manage their Linux system.
You will communicate by analyzing the user's request, explaining your thought process, and proposing bash commands to execute.

CRITICAL RULES:
1. You DO NOT execute commands yourself. You only propose them. The user must approve them.
2. NEVER propose destructive commands like `rm -rf /` or commands that could permanently break the system without extreme caution and explicit warning in your message.
3. Keep your proposed commands concise and targeted.
4. When you receive log output (stdout/stderr) from previously executed commands, analyze it carefully. If there was an error, explain what went wrong and propose a fix.
5. If the problem is not fully resolved, you MUST propose the next logical bash commands to diagnose or fix it. Do not just ask the user to check things manually and DO NOT return an empty `proposed_commands` array if you intend to check something—provide the actual commands in the `proposed_commands` list.
6. At the beginning of troubleshooting a new hardware or system issue, propose commands to gather general system information (e.g., `cat /etc/os-release`, `uname -r`) if you haven't done so yet.
7. If the user says something like "Don't do X, do Y instead", adapt your plan and propose new commands.
8. The user may need to run commands with `sudo`. If `sudo` is required, include it in your proposed commands. The backend handles interactive password input securely.
9. Return your response EXACTLY as a JSON object matching this schema, and NOTHING ELSE:
{
  "message": "The explanation of the situation or analysis of logs.",
  "proposed_commands": ["command 1", "command 2"]
}

EXAMPLE RESPONSE:
{
  "message": "It looks like the audio service is not running. Let's check your OS version and see what audio processes are active.",
  "proposed_commands": [
    "cat /etc/os-release",
    "ps aux | grep -i pulse",
    "amixer -c 0"
  ]
}
"""

class SettingsManager:
    def __init__(self, settings_file="data/settings.json"):
        self.settings_file = settings_file
        self.api_key = ""
        self.base_url = ""
        self.model = "gpt-4o-2024-08-06"
        os.makedirs(os.path.dirname(self.settings_file), exist_ok=True)
        self.load()

    def load(self):
        if os.path.exists(self.settings_file):
            try:
                with open(self.settings_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.api_key = data.get("api_key", "")
                    self.base_url = data.get("base_url", "")
                    self.model = data.get("model", "gpt-4o-2024-08-06")
            except Exception as e:
                print(f"Error loading settings: {e}")

    def save(self):
        try:
            with open(self.settings_file, "w", encoding="utf-8") as f:
                json.dump({
                    "api_key": self.api_key,
                    "base_url": self.base_url,
                    "model": self.model
                }, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving settings: {e}")

    def update(self, api_key: str, base_url: str, model: str):
        self.api_key = api_key
        self.base_url = base_url
        self.model = model
        self.save()


class ChatAgent:
    def __init__(self, chat_id: str, settings_manager: SettingsManager):
        self.chat_id = chat_id
        self.data_file = f"data/chats/{chat_id}.json"
        self.settings = settings_manager
        self.history = [{"role": "system", "content": SYSTEM_PROMPT}]
        self.summary = f"Chat {chat_id[:6]}"
        os.makedirs(os.path.dirname(self.data_file), exist_ok=True)
        self.load_data()

    def load_data(self):
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.summary = data.get("summary", self.summary)
                    history = data.get("history", [{"role": "system", "content": SYSTEM_PROMPT}])
                    
                    # Force the latest system prompt
                    if history and history[0].get("role") == "system":
                        history[0]["content"] = SYSTEM_PROMPT
                    self.history = history
            except Exception as e:
                print(f"Error loading chat {self.chat_id}: {e}")

    def save_data(self):
        # Auto-generate summary from first user message if it's default
        if self.summary.startswith("Chat ") and len(self.history) > 1:
            for msg in self.history:
                if msg["role"] == "user":
                    words = msg["content"].split()
                    self.summary = " ".join(words[:4]) + ("..." if len(words) > 4 else "")
                    break

        try:
            with open(self.data_file, "w", encoding="utf-8") as f:
                json.dump({
                    "summary": self.summary,
                    "history": self.history
                }, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving chat {self.chat_id}: {e}")

    def add_user_message(self, content: str):
        self.history.append({"role": "user", "content": content})
        self.save_data()
        
    def add_system_message(self, content: str):
        self.history.append({"role": "system", "content": content})
        self.save_data()
        
    def add_assistant_message(self, message: str, commands: List[str]):
        content = f"Message: {message}\nProposed Commands: {json.dumps(commands)}"
        self.history.append({"role": "assistant", "content": content})
        self.save_data()

    async def get_response(self) -> AgentResponse:
        api_key = self.settings.api_key
        if not api_key:
            raise Exception("API Key not configured.")
            
        kwargs = {"api_key": api_key}
        if self.settings.base_url:
            kwargs["base_url"] = self.settings.base_url

        client = AsyncOpenAI(**kwargs)
        
        response = await client.chat.completions.create(
            model=self.settings.model,
            messages=self.history,
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        if content:
            # Strip markdown json block if model returned it
            content = content.strip()
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
            
            parsed = json.loads(content)
            # If the model uses 'thought' instead of 'message', fix it
            if "thought" in parsed and "message" not in parsed:
                parsed["message"] = parsed.pop("thought")
                
            parsed_response = AgentResponse(**parsed)
            self.add_assistant_message(parsed_response.message, parsed_response.proposed_commands)
            return parsed_response
        else:
            raise Exception("Failed to parse LLM response")

def get_all_chats():
    chat_files = glob.glob("data/chats/*.json")
    chats = []
    for file in chat_files:
        chat_id = os.path.basename(file).replace(".json", "")
        try:
            with open(file, "r") as f:
                data = json.load(f)
                chats.append({
                    "id": chat_id,
                    "summary": data.get("summary", f"Chat {chat_id[:6]}")
                })
        except:
            pass
    return chats
