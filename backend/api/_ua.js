export function parseUserAgent(uaString) {
  const ua = (uaString || '').toLowerCase();
  
  // 1. Device Type
  let device_type = 'Desktop';
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    device_type = 'Tablet';
  } else if (/mobile|iphone|ipod|android|blackberry|opera mini|windows phone/i.test(ua)) {
    device_type = 'Mobile';
  }

  // 2. Operating System
  let operating_system = 'Unknown';
  if (ua.includes('windows')) {
    operating_system = 'Windows';
  } else if (ua.includes('macintosh') || ua.includes('mac os')) {
    operating_system = 'macOS';
  } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
    operating_system = 'iOS';
  } else if (ua.includes('android')) {
    operating_system = 'Android';
  } else if (ua.includes('linux')) {
    operating_system = 'Linux';
  } else if (ua.includes('cros')) {
    operating_system = 'Chrome OS';
  }

  // 3. Browser
  let browser = 'Unknown';
  if (ua.includes('edg/') || ua.includes('edge/')) {
    browser = 'Edge';
  } else if (ua.includes('samsungbrowser')) {
    browser = 'Samsung Internet';
  } else if (ua.includes('chrome') || ua.includes('crios')) {
    browser = 'Chrome';
  } else if (ua.includes('firefox') || ua.includes('fxios')) {
    browser = 'Firefox';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = 'Safari';
  } else if (ua.includes('opera') || ua.includes('opr/')) {
    browser = 'Opera';
  }

  return {
    device_type,
    operating_system,
    browser,
    user_agent: uaString || null
  };
}
