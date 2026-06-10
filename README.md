# AI HelpDesk

## Project Description
AI HelpDesk is an autonomous diagnostic agent developed to assist with Linux OS administration and diagnostics using artificial intelligence.
The system acts as a smart system administrator assistant: it analyzes user requests or system logs, and autonomously generates and proposes `bash` commands to solve problems. Upon your approval, the commands are executed in an interactive pseudo-terminal. It supports the most popular LLM providers (OpenAI, DeepSeek, Google Gemini, Anthropic/OpenRouter, Groq, and local models via Ollama).

## Architecture
The project consists of two main parts:
- **Backend (FastAPI + Python)**: Provides a REST API for managing chat history, saving settings, and generating AI responses. Terminal command execution is isolated and managed via WebSocket connections using the `pexpect` library.
- **Frontend (React + Vite + TypeScript)**: A modern user interface with an interactive chat window and terminal. It provides real-time log viewing and input capabilities for processes that require confirmation or manual data entry.

## System Requirements
- **OS**: Linux (required for full agent functionality, as it generates Linux commands)
- **Python**: 3.10+
- **Node.js**: 18+

---

## Deployment Instructions

### 1. Backend Setup
Open a terminal and navigate to the `backend` directory.
It is recommended to use a virtual environment:

```bash
cd backend

# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload
# Or using fastapi cli: fastapi dev main.py
```
*The backend server will successfully start at `http://127.0.0.1:8000`.*

### 2. Frontend Setup
Open a new terminal tab and navigate to the `frontend` directory:

```bash
cd frontend

# Install necessary npm packages
npm install

# Start the development server
npm run dev
```
*The Vite server will start, and you can open the application in your browser (usually at `http://localhost:5173`).*

---

## Operation and Usage Guide

1. **First Launch and Configuration**:
   When opening the application in the browser, you will see a message prompting you to configure settings. Click the **Settings** button in the sidebar. 
   - Select your preferred provider from the list (Preset).
   - Enter your valid API key.
   - If necessary, specify a custom base URL and model name. Save the settings.
2. **Chatting with the Agent**:
   - Click **New Chat** to start a new session.
   - Describe your problem in the input field (for example: *"There is no sound in the system"*, or *"Check which processes consume the most memory"*).
3. **Executing Commands**:
   - The agent will analyze your request and return an action plan along with a block of proposed commands.
   - Review the commands. If you agree, click **Execute All**.
   - The commands will start executing. You can monitor their output in the chat window in real-time.
   - If a command requires keyboard input (e.g., a password for `sudo`), you can enter it in the special `Input:` field that appears next to the terminal. You can also interrupt the process using the `Ctrl+C` or `Kill` buttons.
4. **Automatic Analysis**:
   - After command execution finishes, the log is automatically sent to the agent. The agent will draw conclusions regarding the success of the operations and, if necessary, propose the next steps.
