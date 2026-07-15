import urllib.request
import json

games = ['iidx/SP', 'iidx/DP', 'bms/7K', 'bms/14K', 'chunithm/Single']

for g in games:
    for u in [1, 2]:
        url = f"https://boku.tachi.ac/api/v1/users/{u}/games/{g}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        try:
            with urllib.request.urlopen(req) as response:
                print(f"[SUCCESS] {url} -> {response.getcode()}")
        except Exception as e:
            pass

    for u in [1, 2, "Lolergags"]:
        url = f"https://kamai.tachi.ac/api/v1/users/{u}/games/{g}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        try:
            with urllib.request.urlopen(req) as response:
                print(f"[SUCCESS] {url} -> {response.getcode()}")
        except Exception as e:
            pass
