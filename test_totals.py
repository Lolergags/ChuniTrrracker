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
        
        intl_max_ops = []
        jp_max_ops = []
        lum_plus_ops = []
        
        for song in songs:
            avail = song.get('availability', {})
            is_intl = avail.get('intl', False)
            is_jp = avail.get('jp', False)
            version = song.get('version', '')
            
            # Find max constant for this song
            max_const = 0
            for chart in song.get('charts', []):
                if chart.get('difficulty') != 'WE':
                    c = chart.get('const', 0)
                    if c > max_const:
                        max_const = c
                        
            if max_const > 0:
                op = ((max_const * 5000 + 15000) // 5) * 5
                
                if is_intl:
                    intl_max_ops.append(op)
                if is_jp:
                    jp_max_ops.append(op)
                if is_intl and version not in ['VERSE', 'X-VERSE', 'X-VERSE-X', 'MATE']:
                    lum_plus_ops.append(op)
                    
        print(f"Intl Total OP: {sum(intl_max_ops) / 10000:.4f}")
        print(f"JP Total OP: {sum(jp_max_ops) / 10000:.4f}")
        print(f"Intl Luminous+ OP: {sum(lum_plus_ops) / 10000:.4f}")
except Exception as e:
    print(e)
