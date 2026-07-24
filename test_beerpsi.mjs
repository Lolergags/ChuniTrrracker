async function run() {
  const res = await fetch('https://chunithm.beerpsi.cc/songs');
  const data = await res.json();
  const chart239116 = data.find(s => s.id === 239116);
  console.log('Song 239116:', chart239116?.title);
  
  // Try to find 天体観測
  const tentai = data.find(s => s.title === '天体観測');
  console.log('天体観測 songId:', tentai?.id);
}
run();
