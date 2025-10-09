        let currentUserID = null ;  // Biến lưu trữ ID người dùng hiện tại
        const currentUserElement = document.getElementById('current-user-name'); // Phần tử hiển thị người dùng hiện tại
        const currentUserIdElement = document.getElementById('current-user-id'); // Phần tử hiển thị ID người dùng hiện tại
        const userMessageElement = document.getElementById('userMessage'); // Phần tử hiển thị thông báo người dùng
        const createUserForm = document.getElementById('createUserForm'); // Form tạo người dùng mới
 // Khởi tạo Chart.js cho nhịp tim
        const heartRateCtx = document.getElementById('heartRateChart').getContext('2d');
        const heartRateChart = new Chart(heartRateCtx, {
            type: 'line',
            data: {
                labels: Array(20).fill(''),
                datasets: [{
                    label: 'Nhịp Tim (BPM)',
                    data: [],
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 3,
                    pointBackgroundColor: '#ff6b6b',
                    borderWidth: 2
                }]
            },
            options: {
                scales: {
                    x: { display: false },
                    y: { 
                        beginAtZero: false,
                        suggestedMin: 50,
                        suggestedMax: 120,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' }
                    }
                },
                plugins: {
                    legend: { display: false },
                    title: { 
                        display: true,
                        text: 'Biểu đồ Nhịp Tim',
                        color: '#2c3e50',
                        font: { size: 14 }
                    }
                },
                animation: {
                    duration: 500,
                    easing: 'easeOutCubic'
                }
            }
        });

        // Khởi tạo Chart.js cho SpO2
        const spo2Ctx = document.getElementById('spo2Chart').getContext('2d');
        const spo2Chart = new Chart(spo2Ctx, {
            type: 'line',
            data: {
                labels: Array(20).fill(''),
                datasets: [{
                    label: 'SpO2 (%)',
                    data: [],
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 3,
                    pointBackgroundColor: '#4ade80',
                    borderWidth: 2
                }]
            },
            options: {
                scales: {
                    x: { display: false },
                    y: { 
                        beginAtZero: false,
                        suggestedMin: 90,
                        suggestedMax: 100,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' }
                    }
                },
                plugins: {
                    legend: { display: false },
                    title: { 
                        display: true,
                        text: 'Biểu đồ SpO2',
                        color: '#2c3e50',
                        font: { size: 14 }
                    }
                },
                animation: {
                    duration: 500,
                    easing: 'easeOutCubic'
                }
            }
        });
        // Khởi tạo Chart.js cho Nhiệt độ (Thêm đoạn code này)
        const objecttempCtx = document.getElementById('objecttempChart').getContext('2d');
        const objecttempChart = new Chart(objecttempCtx, {
            type: 'line',
            data: {
                labels: Array(20).fill(''),
                datasets: [{
                    label: 'Nhiệt Độ (°C)',
                    data: [],
                    borderColor: '#f39c12', // Vàng/Cam
                    backgroundColor: 'rgba(243, 156, 18, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 3,
                    pointBackgroundColor: '#fbbd23',
                    borderWidth: 2
                }]
            },
            options: {
                scales: {
                    x: { display: false },
                    y: { 
                        beginAtZero: false,
                        suggestedMin: 30, // Thang đo hợp lý
                        suggestedMax: 40,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' } 
                    }
                },
                plugins: {
                    legend: { display: false },
                    title: { 
                        display: true,
                        text: 'Biểu đồ Nhiệt Độ',
                        color: '#2c3e50',
                        font: { size: 14 }
                    }
                },
                animation: {
                    duration: 500,
                    easing: 'easeOutCubic'
                }
            }
        });
        // Hàm chuyển đổi tab
        function showChart(chartType) {
            const heartRateContainer = document.getElementById('heartRateChartContainer'); // Nhịp tim
            const spo2Container = document.getElementById('spo2ChartContainer'); // SpO2
            const objecttempContainer = document.getElementById('objecttempChartContainer'); // Nhiệt độ
            const tabs = document.querySelectorAll('.tab');// Các tab
            // Ẩn tất cả và chỉ hiển thị tab được chọn
            heartRateContainer.classList.remove('active'); // Ẩn biểu đồ nhịp tim
            spo2Container.classList.remove('active'); // Ẩn biểu đồ SpO2
            objecttempContainer.classList.remove('active'); // Ẩn biểu đồ Nhiệt độ

            tabs.forEach(tab => tab.classList.remove('active'));    // Xóa active khỏi tất cả tab

            if (chartType === 'heartRate') {    // Hiển thị nhịp tim
                heartRateContainer.classList.add('active');     // Hiển thị biểu đồ nhịp tim
                tabs[0].classList.add('active');        // Kích hoạt tab nhịp tim
            } else if (chartType === 'spo2') { // Hiển thị nhiệt độ
                spo2Container.classList.add('active');
                tabs[1].classList.add('active');
            } else if (chartType === 'objecttemp') { // Hiển thị nhiệt độ
                objecttempContainer.classList.add('active');
                tabs[2].classList.add('active');
            }
        }

            // Xử lý khi submit form tạo người dùng mới
        createUserForm.addEventListener('submit', function(event) { // Xử lý khi submit form
            event.preventDefault(); // Ngăn chặn hành vi tải lại trang

            const username = document.getElementById('username').value;
            const fullname = document.getElementById('fullName').value;
            const ageStr = document.getElementById('age').value;
            const gender = document.getElementById('gender').value;
            const age = parseInt(ageStr); // Chuyển đổi tuổi sang số nguyên

            if (isNaN(age) || age <= 0 || ageStr.trim() === '')  {  // Kiểm tra tuổi hợp lệ 
                userMessageElement.textContent = 'Vui lòng nhập tuổi hợp lệ.'; // Thông báo lỗi
                userMessageElement.style.color = '#e74c3c'; // Màu đỏ
                return; // Dừng xử lý tiếp theo
            }

            if (username.trim() === '' || fullname.trim()  === '' ) {          // Kiểm tra các trường không được để trống
                userMessageElement.textContent = 'Vui lòng điền đầy đủ thông tin.'; // Thông báo lỗi
                userMessageElement.style.color = '#f87171'; // Màu đỏ
                return; // Dừng xử lý tiếp theo
            }


            if (socket.readyState === WebSocket.OPEN) { // Kiểm tra kết nối WebSocket
                const message = `CREATE_USER:${username}:${fullname}:${age}:${gender}`; // Định dạng tin nhắn
                socket.send(message); // Gửi tin nhắn đến server
                userMessageElement.textContent = 'Đang tạo người dùng...'; // Thông báo đang tạo người dùng   
            } else {
                userMessageElement.textContent = 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.'; // Thông báo lỗi kết nối
                userMessageElement.style.color = '#f87171'; // Màu đỏ   
            }
        });
        // WebSocket logic
        const heartRateElement = document.getElementById('heart-rate'); // Phần tử hiển thị nhịp tim
        const spo2Element = document.getElementById('spo2');        // Phần tử hiển thị SpO2
        const objecttempElement = document.getElementById('objecttemp'); // Phần tử hiển thị nhiệt độ cơ th
        const statusElement = document.getElementById('status');        // Phần tử hiển thị trạng thái kết nối
        const socket = new WebSocket('ws://192.168.137.1:3030');    // Thay đổi URL nếu cần

        socket.onopen = function(event) {               // Khi kết nối mở
            console.log('Đã kết nối với máy chủ WebSocket.');
            statusElement.textContent = 'Đã kết nối';
            statusElement.className = 'status connected';
        };

        socket.onmessage = function(event) {        // Khi nhận được tin nhắn
            console.log('Dữ liệu từ máy chủ:', event.data);
            const data = event.data;        // Dữ liệu nhận được

            if (data.startsWith('USER_CREATED:')) { // Kiểm tra nếu tin nhắn bắt đầu bằng 'USER_CREATED: '
                const parts = data.substring('USER_CREATED:'.length).split(':'); // Tách phần sau 'USER_CREATED: '
                if (parts.length === 2 ) {  // Kiểm tra nếu có đúng 2 phần (ID và username)
                    currentUserID = parseInt(parts[0]); // Lấy ID người dùng
                    const username = parts[1]; // Lấy username
                    currentUserElement.textContent = username; // Hiển thị tên người dùng hiện tại
                    currentUserIdElement.textContent = currentUserID; // Hiển thị ID người dùng hiện tại
                    userMessageElement.textContent = 'Tạo người dùng thành công!' ; // Thông báo thành công 
                    userMessageElement.style.color = '#4ade80'; // Màu xanh lá
                }
                return; // Dừng xử lý tiếp theo
            } else if (data === 'ERROR: Could not create user') {
                userMessageElement.textContent = 'Lỗi: Không thể tạo người dùng.'; // Thông báo lỗi
                userMessageElement.style.color = '#f87171';
                return; // Dừng xử lý tiếp theo
            }

            const parts = data.split(':');  // Dữ liệu từ ESP32: "nhịp tim:spo2:nhiệt độ"
            
            if (parts.length >= 3) {    // Kiểm tra định dạng dữ liệu
                const heartRate = parseFloat(parts[0]); // Chuyển đổi nhịp tim sang số
                const spo2 = parseFloat(parts[1]);      // Chuyển đổi SpO2 sang số
                const objecttemp = parseFloat(parts[2]); // Chuyển đổi nhiệt độ vật thể sang số
                // Cập nhật giá trị văn bản
                heartRateElement.textContent = heartRate;       // Cập nhật nhịp tim
                spo2Element.textContent = spo2;     // Cập nhật SpO2
                objecttempElement.textContent = objecttemp; // Cập nhật nhiệt độ cơ thể
                heartRateElement.style.animation = 'liquidPulse 1s ease-in-out';    // Hiệu ứng nhịp tim
                spo2Element.style.animation = 'liquidPulse 1s ease-in-out';     // Hiệu ứng SpO2
                objecttempElement.style.animation = 'liquidPulse 1s ease-in-out'; // Hiệu ứng nhiệt độ cơ thể
                setTimeout(() => {
                    heartRateElement.style.animation = '';
                    spo2Element.style.animation = '';
                    objecttempElement.style.animation = '';
                }, 1000);

                // Cập nhật đồ thị
                if (!isNaN(heartRate)) {
                    heartRateChart.data.datasets[0].data.push(heartRate);
                    if (heartRateChart.data.datasets[0].data.length > 20) {
                        heartRateChart.data.datasets[0].data.shift();
                    }
                    heartRateChart.update();
                }
                if (!isNaN(spo2)) {
                    spo2Chart.data.datasets[0].data.push(spo2);
                    if (spo2Chart.data.datasets[0].data.length > 20) {
                        spo2Chart.data.datasets[0].data.shift();
                    }
                    spo2Chart.update();
                }
                if (!isNaN(objecttemp)) { // Cập nhật biểu đồ nhiệt độ (Thêm đoạn code này)
                    objecttempChart.data.datasets[0].data.push(objecttemp); 
                    if (objecttempChart.data.datasets[0].data.length > 20) {
                        objecttempChart.data.datasets[0].data.shift();
                    }
                    objecttempChart.update();
                }
                // Gửi dữ liệu lên server kèm userID hiện tại
                // Đảm bảo chỉ gửi khi currentUserID đã được cập nhật (khác null và là số)
                if (socket.readyState === WebSocket.OPEN && currentUserID !== null && !isNaN(currentUserID)) {
                    // Định dạng gửi: userID:heartRate:spo2:objecttemp
                    const sendData = `${currentUserID}:${heartRate}:${spo2}:${objecttemp}`;
                    socket.send(sendData);
                    // Chú thích: Dữ liệu này sẽ được server kiểm tra userID trước khi lưu vào database
                }
            }
            
        };

        socket.onclose = function(event) {
            console.log('Mất kết nối với máy chủ WebSocket.');
            statusElement.textContent = 'Mất kết nối';
            statusElement.className = 'status disconnected';
        };

        socket.onerror = function(error) {
            console.error('Lỗi WebSocket:', error);
            statusElement.textContent = 'Lỗi kết nối';
            statusElement.className = 'status error';
        };