from fastapi import WebSocket
from typing import Set
class ConnectionManager:
    def __init__(self):
        self.connections: Set[WebSocket] = set()
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.connections.add(websocket)
    def disconnect(self, websocket: WebSocket):
        self.connections.discard(websocket)
    async def broadcast(self, event: dict):
        dead=[]
        for connection in list(self.connections):
            try:
                await connection.send_json(event)
            except Exception:
                dead.append(connection)
        for connection in dead:
            self.disconnect(connection)
manager = ConnectionManager()
