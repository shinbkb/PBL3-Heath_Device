window.addEventListener('DOMContentLoaded', (event) => {        // Đảm bảo mã chạy sau khi DOM tải xong
       let currentUserID = null ;  // Biến lưu trữ ID người dùng hiện tại
        const currentUserElement = document.getElementById('current-user-name'); // Phần tử hiển thị người dùng hiện tại
        const currentUserIdElement = document.getElementById('current-user-id'); // Phần tử hiển thị ID người dùng hiện tại
        const userMessageElement = document.getElementById('userMessage'); // Phần tử hiển thị thông báo người dùng
        const createUserForm = document.getElementById('createUserForm'); // Form tạo người dùng mới
        const setCurrentUserBtn = document.getElementById('setCurrentUserBtn'); // Nút đặt người dùng hiện tại
        const existingUsersSelect = document.getElementById('existingUsersSelect'); // Dropdown chọn người dùng hiện có
        const currentSelectionStatus = document.getElementById('currentSelectionStatus'); // Phần tử hiển thị trạng thái lựa chọn hiện tại
        const Thresholds = {            // Định nghĩa ngưỡng cảnh báo
            HR_low: 60,   // Ngưỡng nhịp tim thấp
            HR_high: 100, // Ngưỡng nhịp tim cao
            SpO2_low: 95 , // Ngưỡng SpO2 thấp
            Temp_low: 36.0, // Ngưỡng nhiệt độ thấp
            Temp_high: 38 // Ngưỡng nhiệt độ cao

        };
        const modalOverlays = document.querySelectorAll('.modal-overlay');      // Lớp phủ modal
        const modalCloseButtons = document.querySelectorAll('.modal-close');        // Nút đóng modal
        const modalTriggers = document.querySelectorAll('.modal-trigger');      // Trình kích hoạt modal
       

        
        (function restoreSavedUser() {      // Hàm khôi phục người dùng đã lưu từ localStorage
            const saved = localStorage.getItem('selectedUserID');
            if (saved) {
                const id = parseInt(saved,10); // Phân tích chuỗi lưu trong localStorage thành số nguyên
                if (!isNaN(id)) {
                    currentUserID = id; // Khôi phục ID người dùng hiện tại
                    if (currentSelectionStatus) currentSelectionStatus.textContent = `Đang giám sát User ID: ${currentUserID}`; // Cập nhật hiển thị người dùng hiện tại
                    if (currentUserIdElement) currentUserIdElement.textContent = currentUserID;   // Hiển thị ID người dùng hiện tại    
                }
            }
        }) ();

        function populateExistingUsers(users) {     // Hàm điền danh sách người dùng hiện có vào dropdown
            if (!existingUsersSelect) return;       // Nếu không tìm thấy phần tử, thoát hàm
            existingUsersSelect.innerHTML = '<option value="" disabled selected>Chọn người dùng để giám sát</option>';      // Reset options
            users.forEach(u => {        // Thêm từng user vào dropdown
            const opt = document.createElement('option');   // Tạo phần tử option mới
            opt.value = u.id;   // Giá trị là ID người dùng
            opt.textContent = `ID ${u.id} — ${u.username || 'No name'}`;        // Hiển thị ID và username
            existingUsersSelect.appendChild(opt);   // Thêm option vào select
            }); 
            // Nếu đã có user lưu, chọn tự động nếu tồn tại trong list
            if (currentUserID) {    // Nếu đã có userID hiện tại
            const opt = existingUsersSelect.querySelector(`option[value="${currentUserID}"]`);  //  Tìm option tương ứng
            if (opt) opt.selected = true;   // Chọn option nếu tìm thấy
            }
        }

        if (setCurrentUserBtn && existingUsersSelect) {
        setCurrentUserBtn.addEventListener('click', () => {        // Sự kiện khi nhấn nút đặt người dùng hiện tại
            const val = existingUsersSelect.value;      // Lấy giá trị đã chọn
            if (!val) {
                alert('Vui lòng chọn một người dùng từ danh sách.'); // Thông báo nếu chưa chọn
                return;
            } 
            const selectedOption = existingUsersSelect.options[existingUsersSelect.selectedIndex];      // Lấy option đã chọn
            const selectedUserName = selectedOption ? selectedOption.textContent : 'Unknown'; // Lấy tên người dùng đã chọn

            currentUserID = parseInt(val, 10); // Chuyển đổi giá trị sang số nguyên
            localStorage.setItem('selectedUserID', String(currentUserID)); // Lưu vào localStorage

            if (currentSelectionStatus) {
                currentSelectionStatus.textContent = `Đang giám sát User ID: ${currentUserID}`; // Cập nhật hiển thị người dùng hiện tại
            }
  
            const currentUserNameElement = document.getElementById('current-user-name'); // Phần tử hiển thị tên người dùng hiện tại
            const currentUserIdElement = document.getElementById('current-user-id'); // Phần tử hiển thị ID người dùng hiện tại
            if (currentUserNameElement) {   // Nếu phần tử hiển thị tên người dùng hiện tại tồn tại
                currentUserNameElement.textContent = selectedUserName; // Hiển thị tên người dùng hiện tại
            }
            if (currentUserIdElement) {   // Nếu phần tử hiển thị tên người dùng hiện tại tồn tại
                currentUserIdElement.textContent = currentUserID;  // Hiển thị ID người dùng hiện tại
            }

        }); // Xử lý khi nhấn nút đặt người dùng hiện tại
    }
    window.populateExistingUsers = populateExistingUsers; // Đăng ký hàm toàn cục để sử dụng bên ngoài
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
        // Khởi tạo Chart.js cho Lịch sử Nhịp Tim
        const historyHeartRateCtx = document.getElementById('historyHeartRateChart').getContext('2d');    // Lấy ngữ cảnh vẽ từ phần tử canvas
        const historyHeartRateChart = new Chart(historyHeartRateCtx, {      // Tạo biểu đồ mới
            type: 'line',
            data: {
                labels: [], // Labels sẽ là Timestamp
                datasets: [{
                    label: 'Lịch sử Nhịp Tim (BPM)',
                    data: [],
                    borderColor: '#3498db', 
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    fill: false,
                    tension: 0.2,
                    // Make point markers visible: larger radius and distinct color/border
                    pointRadius: 4,
                    pointBackgroundColor: '#3498db',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 1,
                    pointHoverRadius: 6,
                    pointStyle: 'circle'
                }]
            },
            options: {
                scales: {
                            x: {
                                // Use category x-axis to avoid requiring an external date adapter.
                                // We will convert timestamps to formatted strings for labels.
                                type: 'time',
                                time: {
                                    unit: 'hour',
                                    displayFormats: {
                                        minute:'HH:mm',
                                        hour: 'HH:mm dd/MM'
                                    }
                                },
                                title: { display: true, text: 'Thời Gian (Timestamp)' }
                            },
                    y: { 
                        beginAtZero: false,
                        suggestedMin: 50,
                        suggestedMax: 120,
                    }
                },
                plugins: {
                    legend: { display: true },
                    title: { display: false }
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
        window.showChart = showChart; // Đăng ký hàm toàn cục để sử dụng bên ngoài
    
        function checkkSensorAlerts(heartRate, spo2, objecttemp){       // Hàm kiểm tra cảnh báo cảm biến
            const hrCard = document.querySelector('.data-card.heart-rate');    // Phần tử thẻ nhịp tim
            const spo2Card = document.querySelector('.data-card.spo2'); // Phần tử thẻ SpO2
            const tempCard = document.querySelector('.data-card.objecttemp'); // Phần tử thẻ nhiệt độ

            if (heartRate < Thresholds.HR_low || heartRate > Thresholds.HR_high) {      // Kiểm tra nhịp tim
                hrCard.classList.add('alert-active'); // Thêm lớp cảnh báo
            }   else {
                hrCard.classList.remove('alert-active'); // Xóa lớp cảnh báo
            }

            if (spo2 < Thresholds.SpO2_low) {      // Kiểm tra SpO2
                spo2Card.classList.add('alert-active'); // Thêm lớp cảnh báo
            }   else {
                spo2Card.classList.remove('alert-active'); // Xóa lớp cảnh báo
            }    

            if (objecttemp < Thresholds.Temp_low || objecttemp > Thresholds.Temp_high) {      // Kiểm tra nhiệt độ
                tempCard.classList.add('alert-active'); // Thêm lớp cảnh báo
            }   else {
                tempCard.classList.remove('alert-active'); // Xóa lớp cảnh báo
            }
        }
            
        function openModal(modalId) {     // Hàm mở modal
            const modal = document.getElementById(modalId); // Lấy modal theo ID
            if (modal) {        // Kiểm tra nếu modal tồn tại
                modal.classList.add('active'); // Thêm lớp hoạt động để hiển thị modal
            }
        }

        function closeModal(modal) {        // Hàm đóng modal
            if (modal) {        // Kiểm tra nếu modal tồn tại
                modal.classList.remove('active'); // Xóa lớp hoạt động để ẩn modal
            }
        }
        modalTriggers.forEach(trigger => {
            trigger.addEventListener('click', () => {
                const modalId= trigger.getAttribute('data-modal-target'); // Lấy ID modal từ thuộc tính data
                openModal(modalId); // Mở modal tương ứng
            });
        });

        modalCloseButtons.forEach(button => {      // Thêm sự kiện đóng modal cho tất cả nút đóng
            button.addEventListener('click', () => {
                const modal = button.closest('.modal-overlay'); // Tìm modal cha gần nhất
                closeModal(modal); // Đóng modal
            });
        }); 
        modalOverlays.forEach(overlay => {        // Thêm sự kiện đóng modal khi nhấp vào lớp phủ
            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) { // Chỉ đóng nếu nhấp vào lớp phủ, không phải nội dung modal
                    closeModal(overlay); // Đóng modal
                }
            });
        });
        
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
        const historyUserIdSelect = document.getElementById('historyUserIdSelect'); // Phần tử chọn userID cho lịch sử
        const historyMessageElement = document.getElementById('historyMessage'); // Phần tử hiển thị thông báo lịch sử
        function loadHistoryData() {    // Hàm tải dữ liệu lịch sử
            const selectedUserID = historyUserIdSelect.value;
            if (selectedUserID) {
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(`GET_HISTORY:${selectedUserID}`); // Gửi yêu cầu lấy lịch sử
                    historyMessageElement.textContent = `Đang tải dữ liệu lịch sử cho User ID: ${selectedUserID}...`; // Thông báo đang tải
                    historyMessageElement.style.color = '#3498db'; // Màu xanh dương
                } else {
                    historyMessageElement.textContent = 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.'; // Thông báo lỗi kết nối
                    historyMessageElement.style.color = '#f87171'; // Màu đỏ
                } 
            } else {
                historyMessageElement.textContent = 'Vui lòng chọn User ID để xem lịch sử.'; // Thông báo chọn userID
                historyMessageElement.style.color = '#f39c12'; // Màu đỏ
            }
        }
        const loadHistoryButton = document.getElementById('loadHistoryBtn'); // Nút tải dữ liệu lịch sử
        if (loadHistoryButton) {
            loadHistoryButton.addEventListener('click', loadHistoryData); // Xử lý khi nhấn nút tải lịch sử
        }
        socket.onopen = function(event) {               // Khi kết nối mở
            console.log('Đã kết nối với máy chủ WebSocket.');
            statusElement.textContent = 'Đã kết nối';
            statusElement.className = 'status connected';
        };

        socket.onmessage = function(event) {        // Khi nhận được tin nhắn
            console.log('Dữ liệu từ máy chủ:', event.data);
            const data = event.data;        // Dữ liệu nhận được

            if (data.startsWith('USERS_LIST:')) {         // Kiểm tra nếu tin nhắn bắt đầu bằng 'USERS_LIST:'
                const users = JSON.parse(data.substring('USERS_LIST:'.length)); // Lấy danh sách người dùng
                if (window.populateExistingUsers) window.populateExistingUsers(users); // Điền danh sách người dùng vào dropdown chọn người dùng hiện có
                historyUserIdSelect.innerHTML = '<option value="" disabled selected>Chọn User ID</option>';  // Reset options
                users.forEach(user => {         // Thêm từng user vào dropdown
                    const option = document.createElement('option');    // Tạo phần tử option mới
                    option.value = user.id;     // Giá trị là ID người dùng
                    option.textContent = `ID ${user.id}: ${user.username}`; // Hiển thị ID và username
                    historyUserIdSelect.appendChild(option); // Thêm option vào select
                }); 
                return; // Dừng xử lý tiếp theo
            } else if (data.startsWith('HISTORY_DATA:')) {
                // Server may send either 'HISTORY_DATA:JSON' or 'HISTORY_DATA:userID:JSON'
                const payload = data.substring('HISTORY_DATA:'.length);
                let userID = null;
                let historyData = [];
                try {
                    // Try parsing directly as JSON first
                    historyData = JSON.parse(payload);
                } catch (e) {
                    // If parsing fails, maybe it's in the format userID:JSON
                    const idx = payload.indexOf(':');
                    if (idx !== -1) {
                        userID = payload.substring(0, idx);
                        const jsonPart = payload.substring(idx + 1);
                        try {
                            historyData = JSON.parse(jsonPart);
                        } catch (err) {
                            console.error('Failed to parse HISTORY_DATA payload JSON:', err, payload);
                            historyMessageElement.textContent = 'Lỗi khi phân tích dữ liệu lịch sử.';
                            historyMessageElement.style.color = '#f87171';
                            return;
                        }
                    } else {
                        console.error('Unrecognized HISTORY_DATA payload:', payload);
                        historyMessageElement.textContent = 'Dữ liệu lịch sử không hợp lệ.';
                        historyMessageElement.style.color = '#f87171';
                        return;
                    }
                }

                if (historyData && historyData.length > 0) {
                    // Normalize fields: accept heart_rate or heartRate, and timestamp or timer
                    const labels = historyData.map(d => {
                        const ts = d.timestamp || d.timer || d.time || d.created_at || d.datetime || d.date;
                        // Format to locale string for category axis labels
                       
                        return ts; // Return raw timestamp; Chart.js time scale will format it
                    });

                    const heartRates = historyData.map(d => {
                        return d.heart_rate !== undefined ? d.heart_rate : (d.heartRate !== undefined ? d.heartRate : null);
                    });

                    historyHeartRateChart.data.labels = labels;
                    historyHeartRateChart.data.datasets[0].data = heartRates;
                    historyHeartRateChart.update();

                    const displayedUser = userID || (historyData[0].user_id || historyData[0].userId || 'unknown');
                    historyMessageElement.textContent = `Đã tải dữ liệu lịch sử cho User ID: ${displayedUser}`;
                    historyMessageElement.style.color = '#2ecc71';
                } else {
                    historyMessageElement.textContent = `Không có dữ liệu lịch sử.`;
                    historyMessageElement.style.color = '#f39c12';
                }
                return;
            } else if (data.startsWith('USER_CREATED:')) { // Kiểm tra nếu tin nhắn bắt đầu bằng 'USER_CREATED: '
                const parts = data.substring('USER_CREATED:'.length).split(':'); // Tách phần sau 'USER_CREATED: '
                if (parts.length === 2 ) {  // Kiểm tra nếu có đúng 2 phần (ID và username)
                    currentUserID = parseInt(parts[0]); // Lấy ID người dùng
                    const username = parts[1]; // Lấy username
                    currentUserElement.textContent = username; // Hiển thị tên người dùng hiện tại
                    currentUserIdElement.textContent = currentUserID; // Hiển thị ID người dùng hiện tại
                    userMessageElement.textContent = 'Tạo người dùng thành công!' ; // Thông báo thành công 
                    userMessageElement.style.color = '#4ade80'; // Màu xanh lá
                    if (currentSelectionStatus) {
                        currentSelectionStatus.textContent = `Đang giám sát User ID: ${currentUserID}`; // Cập nhật hiển thị người dùng hiện tại
                    }
                    // Lưu userID mới tạo vào localStorage
                    localStorage.setItem('selectedUserID', String(currentUserID)); // Lưu vào localStorage
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
               
                checkkSensorAlerts(heartRate, spo2, objecttemp); // Kiểm tra cảnh báo cảm biến

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
    

        modalOverlays.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) { // Chỉ đóng khi nhấn vào lớp phủ, không phải nội dung modal
                    closeModal(modal);
                }
            });
        });

  
});// Đảm bảo mã chạy sau khi DOM tải xong