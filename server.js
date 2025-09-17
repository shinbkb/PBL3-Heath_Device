const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 3030 });

console.log('WebSocket server is running on port 3030');

wss.on('connection', ws => {
    console.log('Client connected');

    ws.on('message', message => {
        const data = message.toString();
        console.log(`Received from ESP32: ${data}`);

        // Gửi lại tin nhắn cho client (ví dụ: trình duyệt web) để hiển thị
        wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });

    ws.on('error', error => {
        console.error('WebSocket error:', error);
    });
});