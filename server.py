from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Allow cross-origin for local dev

DB_PATH = 'temperature.db'

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            temperature REAL NOT NULL,
            humidity REAL NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

@app.route('/api/reading', methods=['POST'])
def receive_reading():
    data = request.get_json()
    if not data or 'temp' not in data or 'humidity' not in data:
        return jsonify({'error': 'Invalid payload'}), 400
    temp = float(data['temp'])
    humidity = float(data['humidity'])
    timestamp = datetime.utcnow().isoformat()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('INSERT INTO readings (timestamp, temperature, humidity) VALUES (?,?,?)',
              (timestamp, temp, humidity))
    conn.commit()
    conn.close()
    return jsonify({'status': 'ok'}), 200

@app.route('/api/latest', methods=['GET'])
def latest_reading():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT timestamp, temperature, humidity FROM readings ORDER BY id DESC LIMIT 1')
    row = c.fetchone()
    conn.close()
    if row:
        ts, temp, hum = row
        return jsonify({'timestamp': ts, 'temperature': temp, 'humidity': hum})
    else:
        return jsonify({'error': 'No data'}), 404

@app.route('/api/history', methods=['GET'])
def history():
    limit = request.args.get('limit', 100)
    try:
        limit = int(limit)
    except ValueError:
        limit = 100
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT timestamp, temperature, humidity FROM readings ORDER BY id DESC LIMIT ?', (limit,))
    rows = c.fetchall()
    conn.close()
    data = [{'timestamp': ts, 'temperature': temp, 'humidity': hum} for ts, temp, hum in rows]
    return jsonify(data)

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=True)
