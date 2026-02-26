#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

// ----- USER CONFIGURATION -----
const char* ssid = "GorenganGareng";          // TODO: replace with your Wi‑Fi SSID
const char* password = "wekyweky";  // TODO: replace with your Wi‑Fi password
const char* serverUrl = "http://192.168.43.98:5000/api/reading"; // Flask endpoint

// ----- HARDWARE PINS -----
#define DHTPIN 4          // GPIO where the DHT11 data pin is connected
#define DHTTYPE DHT11     // DHT 11 sensor
#define LED_TEMP_PIN 5    // LED based on temperature
#define LED_BLINK_PIN 19  // LED that blinks every second

// ----- SETTINGS -----
const unsigned long READ_INTERVAL_MS = 10000; // 10 seconds between reads
const float TEMP_THRESHOLD = 25.0;           // °C – LED turns ON when temperature > threshold

// ----- GLOBAL OBJECTS -----
DHT dht(DHTPIN, DHTTYPE);
WiFiClient wifiClient;
HTTPClient http;

unsigned long lastReadTime = 0;

void setup() {
  Serial.begin(115200);
  pinMode(LED_TEMP_PIN, OUTPUT);
  pinMode(LED_BLINK_PIN, OUTPUT);
  digitalWrite(LED_TEMP_PIN, LOW);
  digitalWrite(LED_BLINK_PIN, LOW);

  dht.begin();
  connectToWiFi();
}

void loop() {
  // Blink LED every second regardless of sensor reading
  digitalWrite(LED_BLINK_PIN, HIGH);
  delay(500);
  digitalWrite(LED_BLINK_PIN, LOW);
  delay(500);

  if (millis() - lastReadTime >= READ_INTERVAL_MS) {
    lastReadTime = millis();
    readAndSend();
  }
}

void connectToWiFi() {
  Serial.print("Connecting to Wi‑Fi ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 20) {
    delay(500);
    Serial.print('.');
    retry++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWi‑Fi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nFailed to connect to Wi‑Fi.");
  }
}

void readAndSend() {
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature(); // Celsius

  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("Failed to read from DHT sensor!");
    return;
  }

  // Temperature‑based LED logic
  if (temperature > TEMP_THRESHOLD) {
    digitalWrite(LED_TEMP_PIN, HIGH);
  } else {
    digitalWrite(LED_TEMP_PIN, LOW);
  }

  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.println(" °C");
  Serial.print("Humidity: ");
  Serial.print(humidity);
  Serial.println(" %");

  // Ensure Wi‑Fi is connected before sending
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi‑Fi disconnected, attempting reconnection...");
    connectToWiFi();
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("Reconnection failed, aborting send.");
      return;
    }
  }

  // Build JSON payload
  String payload = "{\"temp\":" + String(temperature, 1) + ",\"humidity\":" + String(humidity, 1) + "}";

  http.begin(wifiClient, serverUrl);
  http.addHeader("Content-Type", "application/json");
  int httpResponseCode = http.POST(payload);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("POST response code: ");
    Serial.println(httpResponseCode);
    Serial.println("Server reply: " + response);
  } else {
    Serial.print("Error sending POST: ");
    Serial.println(http.errorToString(httpResponseCode).c_str());
  }
  http.end();
}
