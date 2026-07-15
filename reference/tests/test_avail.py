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
        
        # count availability
        availabilities = {}
        for s in songs:
            avail = str(s.get('availability', 'None'))
            availabilities[avail] = availabilities.get(avail, 0) + 1
            
        print("Availabilities:", availabilities)
        
        # what are the keys in availability?
        print("Sample availability:", songs[0].get('availability'))
except Exception as e:
    print(e)
