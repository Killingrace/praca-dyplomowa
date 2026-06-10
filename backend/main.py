import json
import uuid
from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from agent import ChatAgent
from config import SettingsManager
from storage import get_all_chats, delete_chat_file
from schemas import ChatRequest, SettingsRequest, UpdateSummaryRequest
from executor import execute_commands_interactive

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

settings_manager = SettingsManager()

@app.get("/api/settings")
async def get_settings():
    return {
        "api_key": settings_manager.api_key,
        "base_url": settings_manager.base_url,
        "model": settings_manager.model
    }

@app.post("/api/settings")
async def update_settings(request: SettingsRequest):
    settings_manager.update(request.api_key, request.base_url, request.model)
    return {"status": "success"}

@app.get("/api/chats")
async def list_chats():
    return {"chats": get_all_chats()}

@app.post("/api/chats")
async def create_chat():
    chat_id = str(uuid.uuid4())
    agent = ChatAgent(chat_id, settings_manager)
    return {"chat_id": chat_id, "summary": agent.summary}

@app.delete("/api/chat/{chat_id}")
async def delete_chat(chat_id: str):
    if delete_chat_file(chat_id):
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Chat not found")

@app.put("/api/chat/{chat_id}/summary")
async def update_chat_summary(chat_id: str, request: UpdateSummaryRequest):
    agent = ChatAgent(chat_id, settings_manager)
    agent.summary = request.summary
    agent.save_data()
    return {"status": "success"}

@app.get("/api/chat/{chat_id}/history")
async def get_history(chat_id: str):
    agent = ChatAgent(chat_id, settings_manager)
    frontend_messages = []
    for i, msg in enumerate(agent.history):
        if i == 0 and msg["role"] == "system":
            continue
        
        role = msg["role"]
        content = msg["content"]
        commands = []
        
        if role == "assistant":
            try:
                parts = content.split("Proposed Commands: ")
                if len(parts) == 2:
                    content = parts[0].replace("Message: ", "").strip()
                    commands = json.loads(parts[1])
            except:
                pass
                
        frontend_messages.append({
            "id": str(i),
            "role": role,
            "content": content,
            "commands": commands
        })
    return {"messages": frontend_messages}

@app.post("/api/chat/{chat_id}")
async def chat(chat_id: str, request: ChatRequest):
    agent = ChatAgent(chat_id, settings_manager)
    
    agent.add_user_message(request.message)
    
    try:
        response = await agent.get_response()
        return response.dict()
    except Exception as e:
        agent.history.pop() 
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/execute/{chat_id}")
async def websocket_endpoint(websocket: WebSocket, chat_id: str):
    await websocket.accept()
    agent = ChatAgent(chat_id, settings_manager)
    
    try:
        data = await websocket.receive_json()
        commands = data.get("commands", [])
        
        if not commands:
            await websocket.send_json({"type": "error", "content": "No commands provided"})
            await websocket.close()
            return
            
        full_log = await execute_commands_interactive(commands, websocket)
        
        system_msg = f"Executed the following commands: {json.dumps(commands)}\n\nExecution Log:\n{full_log}\n\nPlease analyze this result."
        agent.add_system_message(system_msg)
        
        await websocket.send_json({"type": "status", "content": "Analyzing logs..."})
        
        try:
            response = await agent.get_response()
            await websocket.send_json({
                "type": "analysis", 
                "content": response.dict()
            })
        except Exception as e:
            await websocket.send_json({"type": "error", "content": f"Failed to analyze logs: {str(e)}"})
        
        await websocket.close()
        
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.send_json({"type": "error", "content": str(e)})
            await websocket.close()
        except:
            pass
