import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

api_key = "f92ed70081bb22bdb1d18d24537be0fc9ff7cff7"
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Authorization': f'Bearer {api_key}'
}

req = urllib.request.Request("https://kamai.tachi.ac/api/v1/users/3536/games/chunithm/pbs/all", headers=headers)
with urllib.request.urlopen(req, context=ctx) as response:
    res = json.loads(response.read().decode())
    print("Keys:", list(res['body']['songs'][0].keys()))
    print("ID:", res['body']['songs'][0].get('id'))
