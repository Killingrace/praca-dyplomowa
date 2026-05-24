import os
import json
import glob
from typing import List, Dict, Any
from config import SYSTEM_PROMPT

def get_all_chats() -> List[Dict[str, Any]]:
    chat_files = glob.glob("data/chats/*.json")
    chats = []
    for file in chat_files:
        chat_id = os.path.basename(file).replace(".json", "")
        try:
            with open(file, "r", encoding="utf-8") as f:
                data = json.load(f)
                chats.append({
                    "id": chat_id,
                    "summary": data.get("summary", f"Chat {chat_id[:6]}")
                })
        except:
            pass
    return chats

def delete_chat_file(chat_id: str) -> bool:
    file_path = f"data/chats/{chat_id}.json"
    if os.path.exists(file_path):
        os.remove(file_path)
        return True
    return False

def load_chat_data(chat_id: str) -> tuple[str, List[Dict[str, Any]]]:
    data_file = f"data/chats/{chat_id}.json"
    summary = f"Chat {chat_id[:6]}"
    history = [{"role": "system", "content": SYSTEM_PROMPT}]
    
    if os.path.exists(data_file):
        try:
            with open(data_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                summary = data.get("summary", summary)
                loaded_history = data.get("history", history)
                
                # Force the latest system prompt
                if loaded_history and loaded_history[0].get("role") == "system":
                    loaded_history[0]["content"] = SYSTEM_PROMPT
                history = loaded_history
        except Exception as e:
            print(f"Error loading chat {chat_id}: {e}")
            
    return summary, history

def save_chat_data(chat_id: str, summary: str, history: List[Dict[str, Any]]):
    data_file = f"data/chats/{chat_id}.json"
    os.makedirs(os.path.dirname(data_file), exist_ok=True)
    
    try:
        with open(data_file, "w", encoding="utf-8") as f:
            json.dump({
                "summary": summary,
                "history": history
            }, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving chat {chat_id}: {e}")
