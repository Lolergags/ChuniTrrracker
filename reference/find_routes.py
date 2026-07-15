import urllib.request
import json

url = "https://api.github.com/repos/zkldi/Tachi/git/trees/main?recursive=1"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        for item in data['tree']:
            if "typescript/server/src/routes/" in item['path'] and item['path'].endswith('.ts'):
                print(item['path'])
except Exception as e:
    print(e)
