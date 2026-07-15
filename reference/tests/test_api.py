import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
}

url = "https://kamai.tachi.ac/api/v1/games/chunithm/leaderboard?limit=100&offset=100"
req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req, context=ctx) as response:
        res = json.loads(response.read().decode())
        print("Offset 100: gameStats rank 0:", res['body']['gameStats'][0].get('rank'))
except Exception as e:
    print(f"Failed {url}: {e}")

url = "https://kamai.tachi.ac/api/v1/games/chunithm/leaderboard?limit=100&start=100"
req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req, context=ctx) as response:
        res = json.loads(response.read().decode())
        print("Keys:", list(res['body'].keys()))
        if 'nextPage' in res['body']:
            print("Next page cursor exists!")
except:
    pass
