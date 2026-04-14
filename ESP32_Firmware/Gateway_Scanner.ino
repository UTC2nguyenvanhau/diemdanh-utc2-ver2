#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <esp_task_wdt.h>
#include <esp_bt.h>

#define SERVICE_UUID        "19b10000-e8f2-537e-4f6c-d104768a1214"
#define CHARACTERISTIC_UUID "19b10001-e8f2-537e-4f6c-d104768a1214"

BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;

// Cờ chống Spam: Chỉ chống Spam TRONG CÙNG 1 PHIÊN KẾT NỐI
unsigned long lastWriteTime = 0;

class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) { 
        deviceConnected = true; 
        lastWriteTime = 0; // Reset cờ Anti-Spam khi có người mới vào (Giải quyết bẫy chặn nhầm)
    }
    void onDisconnect(BLEServer* pServer) { 
        deviceConnected = false; 
    }
};

class MyCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
        unsigned long now = millis();
        
        // CHỐNG SPAM: Ngăn 1 thiết bị gửi dội bom liên tục trong lúc đang kết nối
        // Giới hạn 100ms là cực kỳ an toàn, không ảnh hưởng đến thao tác bình thường
        if (now - lastWriteTime < 100 && lastWriteTime != 0) {
            return; 
        }
        lastWriteTime = now;

        String value = pCharacteristic->getValue();
        if (value.length() > 0) {
            // Tính toán đồng bộ và phản hồi ngay lập tức để Web không bị đọc nhầm
            long challenge = value.toInt();
            long response = (challenge * 7) + 123;
            
            char resBuffer[16];
            ltoa(response, resBuffer, 10);
            pCharacteristic->setValue(resBuffer);
        }
    }
};

void setup() {
    Serial.begin(115200);
    Serial.println("Tram Diem Danh ESP32-S3: San sang thuc chien!");

    // Chó canh cửa 8 giây chuẩn v3
    esp_task_wdt_config_t twdt_config = {
        .timeout_ms = 8000,
        .idle_core_mask = (1 << portNUM_PROCESSORS) - 1,
        .trigger_panic = true,
    };
    esp_task_wdt_init(&twdt_config);
    esp_task_wdt_add(NULL);

    BLEDevice::init("TRAM-DIEM-DANH");
    
    // Ép xung Radio
    esp_ble_tx_power_set(ESP_BLE_PWR_TYPE_DEFAULT, ESP_PWR_LVL_P9);
    esp_ble_tx_power_set(ESP_BLE_PWR_TYPE_ADV, ESP_PWR_LVL_P9);
    esp_ble_tx_power_set(ESP_BLE_PWR_TYPE_SCAN, ESP_PWR_LVL_P9);

    pServer = BLEDevice::createServer();
    pServer->setCallbacks(new MyServerCallbacks());

    BLEService *pService = pServer->createService(SERVICE_UUID);
    pCharacteristic = pService->createCharacteristic(
                           CHARACTERISTIC_UUID,
                           BLECharacteristic::PROPERTY_READ |
                           BLECharacteristic::PROPERTY_WRITE
                       );
    pCharacteristic->setCallbacks(new MyCallbacks());
    pService->start();

    BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->setScanResponse(true);
    
    // Ép xung nhịp tim 7.5ms
    pAdvertising->setMinPreferred(0x06); 
    pAdvertising->setMaxPreferred(0x0C); 
    BLEDevice::startAdvertising();
}

void loop() {
    esp_task_wdt_reset(); 

    // Hồi chiêu siêu tốc 20ms
    if (!deviceConnected && oldDeviceConnected) {
        delay(20); 
        pServer->startAdvertising(); 
        oldDeviceConnected = deviceConnected;
    }
    
    if (deviceConnected && !oldDeviceConnected) {
        oldDeviceConnected = deviceConnected;
    }

    delay(10); 
}
