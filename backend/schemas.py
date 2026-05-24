from typing import List
from pydantic import BaseModel, Field

class AgentResponse(BaseModel):
    message: str = Field(description="The explanation of the situation, analysis of logs, or general response to the user.")
    proposed_commands: List[str] = Field(default_factory=list, description="A list of proposed bash commands to execute on the system to resolve the issue or gather information.")

class ChatRequest(BaseModel):
    message: str

class SettingsRequest(BaseModel):
    api_key: str
    base_url: str = ""
    model: str = "gpt-4o-2024-08-06"

class UpdateSummaryRequest(BaseModel):
    summary: str
