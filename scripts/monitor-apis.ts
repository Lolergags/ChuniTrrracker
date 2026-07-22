async function monitorApis() {
  console.log('Fetching Beerpsi song list...');
  try {
    const response = await fetch('https://chunithm.beerpsi.cc/songs');
    if (!response.ok) {
      throw new Error(`Failed to fetch from Beerpsi: ${response.status}`);
    }

    const songs = await response.json();
    console.log(`Fetched ${songs.length} songs. Checking critical ghost chart IDs...`);

    // Verify ID 50 is Sinfonie
    const song50 = songs.find((s: any) => s.id === 50);
    if (!song50 || !song50.title.includes('Sinfonie')) {
      throw new Error(`CRITICAL: Song ID 50 has changed or is missing! Found: ${song50?.title}`);
    }

    // Verify ID 81 is Sinfonie (Master)
    const song81 = songs.find((s: any) => s.id === 81);
    if (!song81 || !song81.title.includes('Sinfonie')) {
      throw new Error(`CRITICAL: Song ID 81 has changed or is missing! Found: ${song81?.title}`);
    }

    console.log('API Monitor check passed successfully. Ghost chart mappings are still valid.');
  } catch (error) {
    console.error('API Monitor failed!');
    console.error(error);
    process.exit(1);
  }
}

monitorApis();
