import pexpect
import asyncio
from fastapi import WebSocket

async def execute_commands_interactive(commands: list[str], websocket: WebSocket):
    """
    Executes a list of commands in a pseudo-terminal.
    Streams output to the websocket and accepts input from the websocket.
    """
    # Combine commands into a single shell execution for continuity,
    # or execute them one by one. Executing one by one is better for error handling.
    
    full_log = ""
    
    for cmd in commands:
        await websocket.send_json({"type": "status", "content": f"Running: {cmd}"})
        full_log += f"\n$ {cmd}\n"
        
        # We use a wrapper bash script or just run it directly.
        # running in bash ensures builtins work.
        import os
        env = os.environ.copy()
        env["TERM"] = "dumb"  # Disables colors and complex TTY formatting
        env["PAGER"] = "cat"  # Disables pagers like less
        env["SYSTEMD_PAGER"] = "" # Specifically disables systemd's pager
        
        child = pexpect.spawn('/bin/bash', ['-c', cmd], encoding='utf-8', timeout=None, env=env)
        
        # We need to concurrently read from the process and read from the websocket.
        # This allows the user to send passwords (like for sudo) or 'y' for apt.
        
        async def read_process():
            nonlocal full_log
            try:
                while True:
                    # pexpect read_nonblocking is tricky in async, 
                    # let's run a simple synchronous read in an executor
                    char = await asyncio.to_thread(child.read, 1)
                    if not char:
                        break
                    full_log += char
                    await websocket.send_json({"type": "output", "content": char})
            except pexpect.EOF:
                pass
            except Exception as e:
                await websocket.send_json({"type": "output", "content": f"\n[Error reading process: {str(e)}]\n"})

        async def read_websocket():
            try:
                while child.isalive():
                    # Wait for 0.1s to avoid blocking forever if process ends
                    try:
                        data = await asyncio.wait_for(websocket.receive_json(), timeout=0.1)
                        if data.get("type") == "input":
                            # Send input to the process
                            input_text = data.get("content", "") + "\n"
                            child.send(input_text)
                        elif data.get("type") == "sigint":
                            child.sendcontrol('c')
                        elif data.get("type") == "sigkill":
                            import signal
                            child.kill(signal.SIGKILL)
                    except asyncio.TimeoutError:
                        continue
            except Exception:
                pass # Websocket might be closed

        # Run both tasks concurrently
        task_read_proc = asyncio.create_task(read_process())
        task_read_ws = asyncio.create_task(read_websocket())
        
        await task_read_proc
        
        # Cleanup
        child.close()
        task_read_ws.cancel()
        
        exit_code = child.exitstatus
        if exit_code != 0:
            msg = f"\n[Command exited with code {exit_code}]\n"
            full_log += msg
            await websocket.send_json({"type": "output", "content": msg})
            # Continue execution to gather full diagnostic info even if one command fails
            
    await websocket.send_json({"type": "status", "content": "Execution completed."})
    return full_log
