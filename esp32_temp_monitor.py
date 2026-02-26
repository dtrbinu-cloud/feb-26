import network
import urequests
import dht
import machine
import time

# ---- Wi‑Fi credentials ----
SSID = "Gorengan Gareng"
PWD  = "wekyweky"

# ---- Server endpoint ----
SERVER_URL = "http://192.168.43.98:5000/api/reading"

# ---- Pins ----
DHT_PIN   = 4
LED_TEMP_PIN  = 5
LED_BLINK_PIN = 19
LED_COLD_PIN  = 17

# Initialize hardware
sensor = dht.DHT11(machine.Pin(DHT_PIN))
led_temp  = machine.Pin(LED_TEMP_PIN, machine.Pin.OUT)
led_blink = machine.Pin(LED_BLINK_PIN, machine.Pin.OUT)
led_cold  = machine.Pin(LED_COLD_PIN, machine.Pin.OUT)

def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(False)  # Reset interface    time.sleep(1)
    wlan.active(True)
    
    # Scan for networks
    print("Scanning for Wi‑Fi networks...")
    networks = wlan.scan()
    print("Found {} networks:".format(len(networks)))
    for net in networks:
        # SSID, bssid, channel, RSSI, authmode, hidden
        print(" - SSID: {}, RSSI: {}".format(net[0].decode('utf-8'), net[3]))
        
    print("\nConnecting to Wi‑Fi: {}".format(SSID))
    if not wlan.isconnected():
        wlan.connect(SSID, PWD)
        retry = 0
        while not wlan.isconnected() and retry < 20:
            time.sleep(1)
            retry += 1
            print(".", end="")
        print("")
        
    if wlan.isconnected():
        print("Wi‑Fi connected, IP:", wlan.ifconfig()[0])
    else:
        print("Wi‑Fi connection failed - Check SSID/Password or Signal Strength")

def send_reading(temp, hum):
    try:
        payload = {"temp": temp, "humidity": hum}
        r = urequests.post(SERVER_URL, json=payload)
        print("POST response:", r.status_code, r.text)
        r.close()
    except Exception as e:
        print("POST error:", e)

# Connect once at startup
connect_wifi()

while True:
    try:
        sensor.measure()
        t = sensor.temperature()
        h = sensor.humidity()
        print("Temp:", t, "C  Humidity:", h, "%")
        
        # LED Logic
        # GPIO 5: ON if temp > 25 (User's original logic)
        led_temp.value(1 if t > 25 else 0)
        
        # GPIO 19: ON if temp > 25 (Hot), else OFF
        led_blink.value(1 if t > 25 else 0)

        # GPIO 17: ON if temp < 20 (Cold), else OFF
        led_cold.value(1 if t < 20 else 0)
        
        send_reading(t, h)
        time.sleep(10)
            
    except OSError as e:
        print("Sensor error:", e)
        time.sleep(2)
