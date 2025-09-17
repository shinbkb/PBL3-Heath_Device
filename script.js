 // Khởi tạo Chart.js cho nhịp tim
        const heartRateCtx = document.getElementById('heartRateChart').getContext('2d');
        const heartRateChart = new Chart(heartRateCtx, {
            type: 'line',
            data: {
                labels: Array(20).fill(''),
                datasets: [{
                    label: 'Nhịp Tim (BPM)',
                    data: [],
                    borderColor: '#ff6b6b',
                    backgroundColor: 'rgba(255, 107, 107, 0.2)',
                    fill: true,
                    tension: 0.4,
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
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                },
                plugins: {
                    legend: { display: false },
                    title: { 
                        display: true,
                        text: 'Biểu đồ Nhịp Tim',
                        color: 'rgba(255, 255, 255, 0.9)',
                        font: { size: 14 }
                    }
                },
                animation: {
                    duration: 1000,
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
                    borderColor: '#4ade80',
                    backgroundColor: 'rgba(74, 222, 128, 0.2)',
                    fill: true,
                    tension: 0.4,
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
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                },
                plugins: {
                    legend: { display: false },
                    title: { 
                        display: true,
                        text: 'Biểu đồ SpO2',
                        color: 'rgba(255, 255, 255, 0.9)',
                        font: { size: 14 }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeOutCubic'
                }
            }
        });

        // Hàm chuyển đổi tab
        function showChart(chartType) {
            const heartRateContainer = document.getElementById('heartRateChartContainer'); // Nhịp tim
            const spo2Container = document.getElementById('spo2ChartContainer'); // SpO2
            const tabs = document.querySelectorAll('.tab');// Các tab
            // Ẩn tất cả và chỉ hiển thị tab được chọn
            tabs.forEach(tab => tab.classList.remove('active'));
            if (chartType === 'heartRate') {    // Hiển thị nhịp tim
                heartRateContainer.classList.add('active');     // Hiển thị biểu đồ nhịp tim
                spo2Container.classList.remove('active');       // Ẩn biểu đồ SpO2
                tabs[0].classList.add('active');        // Kích hoạt tab nhịp tim
            } else {
                spo2Container.classList.add('active');
                heartRateContainer.classList.remove('active');
                tabs[1].classList.add('active');
            }
        }

        // WebSocket logic
        const heartRateElement = document.getElementById('heart-rate'); // Phần tử hiển thị nhịp tim
        const spo2Element = document.getElementById('spo2');        // Phần tử hiển thị SpO2
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
            const parts = data.split(':');  // Giả sử dữ liệu có định dạng "nhịp tim:spo2"
            
            if (parts.length >= 2) {    // Kiểm tra định dạng dữ liệu
                const heartRate = parseFloat(parts[0]); // Chuyển đổi nhịp tim sang số
                const spo2 = parseFloat(parts[1]);      // Chuyển đổi SpO2 sang số
                
                // Cập nhật giá trị văn bản
                heartRateElement.textContent = heartRate;       // Cập nhật nhịp tim
                spo2Element.textContent = spo2;     // Cập nhật SpO2
                heartRateElement.style.animation = 'liquidPulse 1s ease-in-out';    // Hiệu ứng nhịp tim
                spo2Element.style.animation = 'liquidPulse 1s ease-in-out';     // Hiệu ứng SpO2
                setTimeout(() => {
                    heartRateElement.style.animation = '';
                    spo2Element.style.animation = '';
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