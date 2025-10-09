#include <WiFi.h>
#include <ArduinoWebsockets.h>
#define RXD2 16
#define TXD2 17

using namespace websockets;
WebsocketsClient socket;
const char* websocketServer = "ws://192.168.137.1:3030";
boolean connected = false;

const char* ssid = "SHIN_LAPTOP";
const char* password = "binh2004";
String heartRate = "";
String spo2 = "";
String temp = "";

void handleMessage(WebsocketsMessage message){
  Serial.println(message.data());
}

void handleEvent (WebsocketsEvent event, WSInterfaceString data) {

}

void connectToWebSocket() {
  connected = socket.connect (websocketServer);
    if (connected) {
      Serial.println("Connected");
    } 
    else {
      Serial.println("Connected failed!");
    }
}

void setup() {
  // put your setup code here, to run once:
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
  delay(500);
  Serial.print(".");
  }
  connectToWebSocket(); 
  socket.onMessage(handleMessage);
  socket.onEvent(handleEvent);
  Serial.println("WiFi Connected: " + WiFi.localIP().toString());
  Serial2.begin(115200, SERIAL_8N1, RXD2, TXD2); // UART2 để giao tiếp với STM32

}

void loop() {
  // put your main code here, to run repeatedly:
  if (!connected) {
    Serial.println ("Đang kết nối tới WebSocket Server...");
    connectToWebSocket();
  }
  socket.poll();

  if (Serial2.available()) {
        String data = Serial2.readStringUntil('\n');
        Serial.println("Received from STM32: " + data);
        int bpmIndex = data.indexOf("BPM:");
        int spo2Index = data.indexOf("SpO2:");
         if (data.startsWith("Nhip Tim:")) {
            heartRate = data;
            heartRate.replace("Nhip Tim: ", "");
            heartRate.replace(" bpm", "");
            heartRate.trim();
    } else if (data.startsWith("Oxi:")) {
        spo2 = data;
        spo2.replace("Oxi: ", "");
        spo2.replace("%", "");
        spo2.trim();
    } else if (data.startsWith("Ambient Temp:")) {
      int objectStart = data.indexOf("Object Temp:") + 12;
      int objectEnd = data.indexOf(" C", objectStart);
      if (objectStart != -1 && objectEnd != -1) {
        temp  = data.substring(objectStart, objectEnd);
        temp.trim();
      }
    }
    
    // Chỉ gửi dữ liệu khi cả hai giá trị đều đã được nhận
    if (!heartRate.isEmpty() && !spo2.isEmpty() && !temp.isEmpty()) {
      String message = heartRate + ":" + spo2 + ":" + temp ;
      socket.send(message);
      Serial.println("Gửi dữ liệu: " + message);
      
      // Reset các biến để chuẩn bị cho lần đọc tiếp theo
      heartRate = "";
      spo2 = "";
      temp = "";
    }
  }
    
  
  delay(1000);

}
