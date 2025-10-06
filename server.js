const mysql = require('mysql2/promise');
const WebSocket = require('ws');

const dbConfig = {      // Cấu hình kết nối cơ sở dữ liệu
    host: 'localhost',
    user: 'root',
    password: 'Binh2004@', // Thay 'your_password' bằng mật khẩu thực tế của bạn
    database: 'cambien' 
}; 

let connection;       // Biến kết nối cơ sở dữ liệu

async function connectToDatabase() {
    while (true) {
        try {
            connection = await mysql.createConnection(dbConfig);
            console.log('Connected to the database');
            break; // Kết nối thành công, thoát khỏi vòng lặp
        } catch (error) {
            console.error('Error connecting to the database:', error);
            console.log('Retrying in 5 seconds...');
            await new Promise(resolve => setTimeout(resolve, 5000)); // Chờ 5 giây trước khi thử lại
        }
    }
}
async function saveDataToDatabase(heartRate, spo2, objecttemp) { // Hàm lưu dữ liệu vào cơ sở dữ liệu
    if (!connection) {
        console.error('No database connection available.');
        return;
    }
    try {
        const query = 'INSERT INTO max30102 (heartRate, spo2, temperature) VALUES (?, ?, ?)';
        const [results] = await connection.execute(query, [heartRate, spo2, objecttemp]);
        console.log('Data saved to database:', results);
    } catch (error) {
        console.error('Error saving data to database:', error); // Ghi lỗi nếu có lỗi xảy ra
    }
}
// Tạo WebSocket server
const wss = new WebSocket.Server({ port: 3030 });
connectToDatabase(); // Kết nối đến cơ sở dữ liệu khi khởi động server
console.log('WebSocket server is running on port 3030');

wss.on('connection', ws => {
    console.log('Client connected');

    // Không cần async nữa vì không có await
    ws.on('message', async(message) => { 
        const data = message.toString();
        console.log(`Received from ESP32: ${data}`);

        const parts = data.split(':');
        // Vẫn kiểm tra 3 phần tử (HR, SpO2, Temp)
        if (parts.length >= 3) {  
            const heartRate = parseFloat(parts[0]); 
            const spo2 = parseFloat(parts[1]);      
            const objecttemp = parseFloat(parts[2]); 

            // Cần kiểm tra dữ liệu có phải là số (NaN) trước khi gửi
            if (!isNaN(heartRate) && !isNaN(spo2) && !isNaN(objecttemp)) {
                await saveDataToDatabase(heartRate, spo2, objecttemp); // Lưu dữ liệu vào cơ sở dữ liệu
                console.log(`Saved to DB - Heart Rate: ${heartRate}, SpO2: ${spo2}, Temp: ${objecttemp}`);
                // Gửi lại tin nhắn cho client (ví dụ: trình duyệt web) để hiển thị
                 wss.clients.forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(data);
                    }
                });
            } else {
                console.error('Dữ liệu bị gửi đi có chứa NaN:', data); 
            }
        } else {
            console.error('Dữ liệu không hợp lệ (thiếu phần tử):', data);
        }   
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });

    ws.on('error', error => {
        console.error('WebSocket error:', error);
    });
});