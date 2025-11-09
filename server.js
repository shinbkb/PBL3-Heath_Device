const mysql = require('mysql2/promise');
const WebSocket = require('ws');

const dbConfig = {      // Cấu hình kết nối cơ sở dữ liệu
    host: 'localhost',
    user: 'root',
    password: 'Binh2004@', // Thay 'your_password' bằng mật khẩu thực tế của bạn
    database: 'cambien' 
}; 

let connection;       // Biến kết nối cơ sở dữ liệu

async function connectToDatabase() {    // Hàm kết nối đến cơ sở dữ liệu với cơ chế thử lại
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
async function saveDataToDatabase(userID,heartRate, spo2, objecttemp) { // Hàm lưu dữ liệu vào cơ sở dữ liệu
    if (!connection) {
        console.error('No database connection available.');
        return;
    }
    try {
        const query = 'INSERT INTO max30102 (user_id, heartRate, spo2, temperature) VALUES (?, ?, ?, ?)';
        const [results] = await connection.execute(query, [userID, heartRate, spo2, objecttemp]);
        console.log('Data saved to database:', results);
    } catch (error) {
        console.error('Error saving data to database:', error); // Ghi lỗi nếu có lỗi xảy ra
    }
}
async function createUser(username, fullname, age, gender) {        // Hàm tạo người dùng mới
    if (!connection) {
        console.error('No database connection available.');
        return null;
    }
    try {
        const query = 'INSERT INTO users (username, full_name, age, gender) VALUES (?, ?, ?, ?)';
        const [resolves] = await connection.execute(query, [username, fullname, age , gender]);  // Sử dụng connection.execute để tránh SQL injection
        console.log('User đã được tạo:', resolves);
        return resolves.insertId; // Trả về ID của người dùng mới tạo
    } catch (error) {
        console.error('Error creating user:', error);       // Ghi lỗi nếu có lỗi xảy ra
        return null;
    }
}
async function getAllUsers() {        // Hàm lấy tất cả người dùng
    if (!connection) return [];     // Nếu chưa kết nối DB, trả về mảng rỗng
    try {
        const [rows] = await connection.execute('SELECT id, username FROM users ORDER BY id DESC');     // Lấy id và username từ bảng users, sắp xếp theo id giảm dần
        return rows; // Trả về danh sách người dùng
    }   catch (error) {      // Ghi lỗi nếu có lỗi xảy ra
        console.error('Error getting users:', error);   // Ghi lỗi nếu có lỗi xảy ra
        return [];      // Trả về mảng rỗng nếu có lỗi
    }
}

async function getHistoryData(userID) {     // Hàm lấy dữ liệu lịch sử cho một userID cụ thể
    if (!connection) return [];     // Nếu chưa kết nối DB, trả về mảng rỗng
    try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Lấy thời gian cách đây 24 giờ
        const query = `
            SELECT heartRate AS heart_rate, spo2, temperature, timer AS timestamp           
            FROM max30102
            WHERE user_id = ? AND timer >= ?
            ORDER BY timer DESC
            LIMIT 500
        `;  // Truy vấn lấy dữ liệu lịch sử trong 24 giờ qua cho userID cụ thể.
        const [rows] = await connection.execute(query, [userID, sevenDaysAgo]);   // Thực thi truy vấn với tham số userID và thời gian
        return rows.reverse(); // Trả về dữ liệu lịch sử

    } catch (error) {      // Ghi lỗi nếu có lỗi xảy ra
        console.error('Error getting history data:', error);
        return [];      // Trả về mảng rỗng nếu có lỗi
    }
}
// Tạo WebSocket server
const wss = new WebSocket.Server({ port: 3030 });
connectToDatabase(); // Kết nối đến cơ sở dữ liệu khi khởi động server
console.log('WebSocket server is running on port 3030');

wss.on('connection', ws => {
    console.log('Client connected');

    getAllUsers().then(users => {       // Lấy tất cả người dùng khi có kết nối mới
        ws.send(`USERS_LIST:${JSON.stringify(users)}`); // Gửi danh sách người dùng cho client mới kết nối
    });
    // Không cần async nữa vì không có await
    ws.on('message', async(message) => { 
        const data = message.toString();
        console.log(`Received from ESP32: ${data}`);

        if (data.startsWith('CREATE_USER:')) { // Kiểm tra nếu tin nhắn bắt đầu bằng '
            const parts = data.substring('CREATE_USER:'.length).split(':');    // Tách phần
            if (parts.length === 4 ) { // Kiểm tra nếu có đúng 4 phần (username, fullname, age , gender)
                const [username, fullname, ageStr, gender] = parts;
                const age = parseInt(ageStr); // Chuyển đổi age sang số nguyên
                const userID = await createUser(username, fullname, age , gender); // Tạo người dùng mới và lấy ID
                if (userID !== null) {
                    ws.send(`USER_CREATED:${userID}:${username}`); // Gửi lại ID người dùng mới tạo cho client
                    console.log(`User created with ID: ${userID}:${username}`);
                } else {
                    ws.send('ERROR: Could not create user'); // Gửi thông báo lỗi nếu không thể tạo người dùng
                } 
            } else {
                    console.error('Invalid CREATE_USER format. Expected 4 parts but got:', data);

                }
                return; // Dừng xử lý tiếp theo
            }
        if (data.startsWith('GET_HISTORY:')) {      //Kiểm tra nếu tin nhắn bắt đầu bằng 'GET_HISTORY:'
            const userID = parseInt(data.substring('GET_HISTORY:'.length));    // Lấy userID từ tin nhắn
            if (!isNaN(userID) && userID >0) {
                const historyData = await getHistoryData(userID); // Lấy dữ liệu lịch sử từ cơ sở dữ liệu   
                ws.send(`HISTORY_DATA:${JSON.stringify(historyData)}`); // Gửi dữ liệu lịch sử về client
            }
            return; // Dừng xử lý tiếp theo    
            } 

        const parts = data.split(':');
        // Chấp nhận dữ liệu có 3 hoặc 4 phần tử
        if (parts.length === 4) {
            // Đúng định dạng: userID:heartRate:spo2:objecttemp
            const userID = parseInt(parts[0]);
            const heartRate = parseFloat(parts[1]);
            const spo2 = parseFloat(parts[2]);
            const objecttemp = parseFloat(parts[3]);
            if (!isNaN(userID) && userID > 0 && !isNaN(heartRate) && !isNaN(spo2) && !isNaN(objecttemp)) {
                // Kiểm tra userID có tồn tại trong bảng users
                try {
                    const [rows] = await connection.execute('SELECT id FROM users WHERE id = ?', [userID]);
                    if (rows.length > 0) {
                        await saveDataToDatabase(userID, heartRate, spo2, objecttemp);
                        console.log(`Saved to DB - User ID: ${userID}, Heart Rate: ${heartRate}, SpO2: ${spo2}, Temp: ${objecttemp}`);
                    } else {
                        console.error(`User ID ${userID} không tồn tại trong bảng users, không lưu dữ liệu.`);
                    }
                } catch (err) {
                    console.error('Lỗi kiểm tra userID:', err);
                }
                const webClientData = `${heartRate}:${spo2}:${objecttemp}`;
                wss.clients.forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(webClientData);
                    }
                });
            } else {
                console.error('Dữ liệu bị gửi đi có chứa NaN hoặc userID không hợp lệ:', data);
            }
        } else if (parts.length === 3) {
            // Nếu chỉ có heartRate:spo2:objecttemp, KHÔNG lưu vào DB vì không có userID hợp lệ
            const heartRate = parseFloat(parts[0]);
            const spo2 = parseFloat(parts[1]);
            const objecttemp = parseFloat(parts[2]);
            if (!isNaN(heartRate) && !isNaN(spo2) && !isNaN(objecttemp)) {
                console.log('Nhận dữ liệu không có userID, chỉ gửi về client web, không lưu DB.');
                const webClientData = `${heartRate}:${spo2}:${objecttemp}`;
                wss.clients.forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(webClientData);
                    }
                });
            } else {
                console.error('Dữ liệu bị gửi đi có chứa NaN:', data);
            }
        } else {
            console.error('Dữ liệu không hợp lệ (sai định dạng):', data);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });

    ws.on('error', error => {
        console.error('WebSocket error:', error);
    });
});