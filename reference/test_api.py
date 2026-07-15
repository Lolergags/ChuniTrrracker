import urllib.request
import json

urls = [
    "https://kamai.tachi.ac/api/v1/users/Lolergags/games/chunithm/Single/scores/all",
    "https://kamai.tachi.ac/api/v1/users/Lolergags",
    "https://kamai.tachi.ac/api/v1/games/chunithm/Single"
]

for url in urls:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            print(f"\nSUCCESS for {url}")
            if "body" in data:
                print("Keys in body:", list(data["body"].keys()))
                if "scores" in data["body"] and len(data["body"]["scores"]) > 0:
                    print("First score keys:", list(data["body"]["scores"][0].keys()))
                if "charts" in data["body"] and len(data["body"]["charts"]) > 0:
                    print("First chart keys:", list(data["body"]["charts"][0].keys()))
            else:
                print(data)
    except Exception as e:
        print(f"\nERROR for {url}: {e}")
