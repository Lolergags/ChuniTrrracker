import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
}

req = urllib.request.Request("https://chunithm.beerpsi.cc/songs", headers=headers)
try:
    with urllib.request.urlopen(req, context=ctx) as response:
        songs = json.loads(response.read().decode())
        print("Total songs:", len(songs))
        print("First song keys:", list(songs[0].keys()))
        print("First song title:", songs[0]['title'])
        if 'releases' in songs[0]:
             print("Releases:", songs[0]['releases'])
except Exception as e:
    print(e)
