import urllib.request
import json

req = urllib.request.Request(
    'http://localhost:3001/api/scraper/start',
    data=json.dumps({"startId": 1, "testMode": True}).encode(),
    headers={'Content-Type': 'application/json'},
    method='POST'
)

try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode())
except Exception as e:
    print(e)
