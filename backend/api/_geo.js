const geoCache = new Map();

function isPrivateIp(ip) {
  if (!ip) return true;
  const cleanIp = ip.replace(/^::ffff:/, '').trim();
  if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp === 'localhost') return true;
  if (cleanIp.startsWith('10.') || cleanIp.startsWith('192.168.')) return true;
  if (cleanIp.startsWith('172.')) {
    const parts = cleanIp.split('.');
    const second = parseInt(parts[1], 10);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

export async function getGeoLocation(ip) {
  const cleanIp = (ip || '').replace(/^::ffff:/, '').trim();
  if (!cleanIp || isPrivateIp(cleanIp)) {
    return {
      country: 'Local / Development',
      state: null,
      city: null,
      latitude: null,
      longitude: null,
      timezone: null,
      is_approximate: true
    };
  }

  if (geoCache.has(cleanIp)) {
    return geoCache.get(cleanIp);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,country,regionName,city,lat,lon,timezone`, {
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'success') {
        const geo = {
          country: data.country || 'Unknown',
          state: data.regionName || null,
          city: data.city || null,
          latitude: typeof data.lat === 'number' ? data.lat : null,
          longitude: typeof data.lon === 'number' ? data.lon : null,
          timezone: data.timezone || null,
          is_approximate: true
        };
        geoCache.set(cleanIp, geo);
        return geo;
      }
    }
  } catch (err) {
    // GeoIP lookup failed or timed out — fail gracefully
  }

  const fallback = {
    country: 'Unknown',
    state: null,
    city: null,
    latitude: null,
    longitude: null,
    timezone: null,
    is_approximate: true
  };
  geoCache.set(cleanIp, fallback);
  return fallback;
}
