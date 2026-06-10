import json
import re
from typing import List
from openai import AsyncOpenAI
from schemas import AgentResponse
from config import SettingsManager
from storage import load_chat_data, save_chat_data

def _parse_llm_response(raw_content: str) -> AgentResponse:
    """Helper function to parse and validate the LLM's response handling various hallucinations."""
    if not raw_content or not raw_content.strip():
        raise Exception("LLM returned an empty response.")
        
    content = raw_content.strip()
    
    content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL).strip()
    
    if not content:
        raise Exception("The AI model returned an empty response (or only hidden <think> blocks). Please try sending your message again.")
    
    json_match = re.search(r'(\{.*\}|\[.*\])', content, re.DOTALL)
    if json_match:
        content = json_match.group(1)
    
    try:
        parsed = json.loads(content)
    except Exception as e:
        raise Exception(f"JSON Parse Error: {str(e)}\nRaw output: {raw_content}")
        
    if isinstance(parsed, list):
        if len(parsed) > 0 and isinstance(parsed[0], dict):
            parsed = parsed[0]
        elif all(isinstance(x, str) for x in parsed):
            parsed = {"message": "Proceeding with the following commands...", "proposed_commands": parsed}
        else:
            raise Exception(f"Validation Error: Expected a JSON object, but received an empty or invalid list. Raw output: {raw_content}")
    
    if "message" not in parsed:
        for key, value in list(parsed.items()):
            if key not in ["proposed_commands", "commands"] and isinstance(value, str):
                parsed["message"] = parsed.pop(key)
                break
                
    if "commands" in parsed and "proposed_commands" not in parsed:
        parsed["proposed_commands"] = parsed.pop("commands")
        
    try:
        parsed_response = AgentResponse(**parsed)
    except Exception as e:
        raise Exception(f"Validation Error: {str(e)}\nParsed JSON: {json.dumps(parsed)}")
        
    return parsed_response


class ChatAgent:
    def __init__(self, chat_id: str, settings_manager: SettingsManager):
        self.chat_id = chat_id
        self.settings = settings_manager
        self.summary, self.history = load_chat_data(chat_id)

    def save_data(self):
        if self.summary.startswith("Chat ") and len(self.history) > 1:
            for msg in self.history:
                if msg["role"] == "user":
                    words = msg["content"].split()
                    self.summary = " ".join(words[:4]) + ("..." if len(words) > 4 else "")
                    break
        save_chat_data(self.chat_id, self.summary, self.history)

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
        
        raw_content = response.choices[0].message.content
        print(f"\n--- RAW LLM RESPONSE ---\n{raw_content}\n------------------------\n")
        
        parsed_response = _parse_llm_response(raw_content)
        self.add_assistant_message(parsed_response.message, parsed_response.proposed_commands)
        return parsed_response
