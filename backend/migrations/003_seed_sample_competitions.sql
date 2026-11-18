-- ============================================================================
-- Seed Sample Competitions, Registrations, Submissions & Social Engagement
-- ============================================================================

-- 1. Wildlife & Nature Photography 2026 (Active)
INSERT INTO dt_competitions (
    id, competition_no, name, slug, subdomain, category, type,
    description, description_ta,
    rules, rules_ta,
    eligibility, eligibility_ta,
    banner_url, logo_url, primary_color,
    registration_start_date, registration_end_date,
    submission_start_date, submission_end_date,
    voting_start_date, voting_end_date,
    max_entries_per_participant, allowed_formats, max_file_size_mb,
    winner_selection_method, tie_breaker_rule, status, rewards
) VALUES (
    'c0000000-0000-0000-0000-000000000001',
    '26-CMP-101',
    'Wildlife & Nature Photography 2026',
    'photo',
    'photo',
    'photography',
    'public',
    'Showcase the raw beauty of untamed wilderness, rare wildlife moments, and vibrant natural ecosystems from across the globe.',
    'உலகெங்கிலும் உள்ள இயற்கை வனவிலங்குகள், பறவைகள் மற்றும் இயற்கை எழில் கொஞ்சும் அழகிய தருணங்களை உங்கள் கேமராவில் படம்பிடித்து பகிர்ந்து கொள்ளுங்கள்.',
    E'1. Submissions must be original photographs captured by the participant.\n2. Minor color corrections and cropping are permitted; digital manipulation/AI generation is strictly prohibited.\n3. Watermarks or artist branding must not be present on the image.\n4. Decision of the jury and verified voter counts will be final.',
    E'1. புகைப்படங்கள் பங்கேற்பாளரால் எடுக்கப்பட்ட அசல் புகைப்படங்களாக இருக்க வேண்டும்.\n2. ஏஐ (AI) மூலம் உருவாக்கப்பட்ட படங்கள் முற்றிலும் தடைசெய்யப்பட்டுள்ளது.\n3. புகைப்படங்களில் வாட்டர்மார்க் இருக்கக்கூடாது.',
    'Open to photographers, nature enthusiasts, and students of all experience levels.',
    'புகைப்படக் கலைஞர்கள், இயற்கை ஆர்வலர்கள் மற்றும் மாணவர்கள் அனைவரும் பங்கேற்கலாம்.',
    'https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=200&q=80',
    '#059669',
    NOW() - INTERVAL '10 days', NOW() + INTERVAL '30 days',
    NOW() - INTERVAL '10 days', NOW() + INTERVAL '25 days',
    NOW() - INTERVAL '5 days', NOW() + INTERVAL '28 days',
    2, '["image"]'::jsonb, 50,
    'public_voting', 'earliest_submission', 'active',
    '[
      {"place": 1, "title": "1st Prize Champion", "amount": "₹50,000", "description": "Trophy + Sony Alpha Camera Gear"},
      {"place": 2, "title": "2nd Prize Runner-Up", "amount": "₹30,000", "description": "Medal + Pro Photography Kit"},
      {"place": 3, "title": "3rd Place Honor", "amount": "₹15,000", "description": "Certificate + Nature Tour Voucher"}
    ]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Domain mapping
INSERT INTO dt_competition_domains (id, competition_id, domain, is_primary)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'photo.guessme.co', true)
ON CONFLICT (domain) DO NOTHING;

-- 2. Talent & Creative Short Film Contest 2026 (Active)
INSERT INTO dt_competitions (
    id, competition_no, name, slug, subdomain, category, type,
    description, description_ta,
    rules, rules_ta,
    eligibility, eligibility_ta,
    banner_url, logo_url, primary_color,
    registration_start_date, registration_end_date,
    submission_start_date, submission_end_date,
    voting_start_date, voting_end_date,
    max_entries_per_participant, allowed_formats, max_file_size_mb,
    winner_selection_method, tie_breaker_rule, status, rewards
) VALUES (
    'c0000000-0000-0000-0000-000000000002',
    '26-CMP-102',
    'Talent & Creative Short Film Contest 2026',
    'talent',
    'talent',
    'short_film',
    'public',
    'A stage for innovative indie filmmakers, creative storytellers, and visual artists to showcase impactful micro-films.',
    'குறும்பட இயக்குநர்கள் மற்றும் கதைசொல்லிகளுக்கான பிரம்மாண்ட போட்டி. உங்கள் படைப்பாற்றலை உலகுக்கு வெளிப்படுத்துங்கள்.',
    E'1. Maximum video duration: 5 minutes.\n2. Content must adhere to copyright compliance for background music.\n3. Accepted formats: MP4, MOV, WebM.',
    E'1. அதிகபட்ச வீடியோ கால அளவு: 5 நிமிடங்கள்.\n2. பின்னணி இசை காப்புரிமை பெற்றதாக இருக்க வேண்டும்.',
    'Open to independent filmmakers, film students, and creators globally.',
    'சுயாதீன திரைப்பட தயாரிப்பாளர்கள் மற்றும் மாணவர்கள் அனைவரும் பங்கேற்கலாம்.',
    'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?auto=format&fit=crop&w=200&q=80',
    '#7c3aed',
    NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days',
    NOW() - INTERVAL '5 days', NOW() + INTERVAL '20 days',
    NOW() - INTERVAL '2 days', NOW() + INTERVAL '24 days',
    1, '["video"]'::jsonb, 200,
    'hybrid', 'jury_decision', 'active',
    '[
      {"place": 1, "title": "Golden Clapper Champion", "amount": "₹75,000", "description": "OTT Distribution Pitch + Trophy"},
      {"place": 2, "title": "Silver Clapper Runner-Up", "amount": "₹40,000", "description": "Gimbal & Sound Kit"}
    ]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO dt_competition_domains (id, competition_id, domain, is_primary)
VALUES
  ('c1000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'talent.guessme.co', true)
ON CONFLICT (domain) DO NOTHING;

-- 3. Inter-College Coding & Innovation Challenge (Voting Closed)
INSERT INTO dt_competitions (
    id, competition_no, name, slug, subdomain, category, type,
    description, description_ta,
    rules, rules_ta,
    eligibility, eligibility_ta,
    banner_url, logo_url, primary_color,
    registration_start_date, registration_end_date,
    submission_start_date, submission_end_date,
    voting_start_date, voting_end_date,
    max_entries_per_participant, allowed_formats, max_file_size_mb,
    winner_selection_method, tie_breaker_rule, status, rewards
) VALUES (
    'c0000000-0000-0000-0000-000000000003',
    '26-CMP-103',
    'Inter-College Coding & AI Innovation Hackathon',
    'college',
    'college',
    'coding',
    'campus',
    'Solve real-world urban automation challenges using modern AI, edge devices, and cloud computing.',
    'கல்லூரி மாணவர்களுக்கான பிரம்மாண்ட ஏஐ மற்றும் நிரலாக்கப் போட்டி.',
    E'1. Working prototype demonstration required.\n2. Open-source GitHub repository link must be included.',
    E'1. செயல்படும் மாதிரி திட்டம் தேவை.\n2. கிட்ஹப் களஞ்சியம் பகிரப்பட வேண்டும்.',
    'Exclusively for enrolled undergraduate and postgraduate university students.',
    'கல்லூரி மாணவர்கள் மட்டுமே பங்கேற்க தகுதியுடையவர்கள்.',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=200&q=80',
    '#2563eb',
    NOW() - INTERVAL '25 days', NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '25 days', NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '10 days', NOW() - INTERVAL '1 day',
    1, '["image"]'::jsonb, 50,
    'public_voting', 'earliest_submission', 'voting_closed',
    '[
      {"place": 1, "title": "Grand Winner", "amount": "₹1,00,000", "description": "Cash Prize + Paid Cloud Credits"}
    ]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO dt_competition_domains (id, competition_id, domain, is_primary)
VALUES
  ('c1000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 'college.guessme.co', true)
ON CONFLICT (domain) DO NOTHING;

-- 4. Sample Registrations for Wildlife Photography
INSERT INTO dt_competition_registrations (id, competition_id, participant_name, email, phone, bio, status)
VALUES
  ('e1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Arun Kumar', 'arun.photo@gmail.com', '+91 9840123456', 'Wildlife documentarian & safari explorer based in Chennai.', 'active'),
  ('e1000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Priya Sundaram', 'priya.nature@gmail.com', '+91 9840654321', 'Avian enthusiast capturing migratory birds along the Western Ghats.', 'active'),
  ('e1000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'Karthik Raja', 'karthik.lens@gmail.com', '+91 9840998877', 'Macro wildlife and insect ecology photographer.', 'active'),
  ('e1000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'Meenakshi Iyer', 'meena.iyer@gmail.com', '+91 9840112233', 'Landscape and marine conservation photographer.', 'active')
ON CONFLICT (competition_id, email) DO NOTHING;

-- 5. Submissions for Wildlife Photography
INSERT INTO dt_competition_submissions (
    id, submission_no, competition_id, registration_id, title, description,
    media_type, media_url, status, likes_count, comments_count, views_count
) VALUES
  (
    'f1000000-0000-0000-0000-000000000001', 'SUB-1001',
    'c0000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001',
    'Silent Stare of the Bengal Tigress',
    'Captured at dawn in Bandhavgarh National Park. Shot on 400mm f/2.8 lens.',
    'image', 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=1000&q=80',
    'approved', 142, 12, 1840
  ),
  (
    'f1000000-0000-0000-0000-000000000002', 'SUB-1002',
    'c0000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000002',
    'Emerald Kingfisher Mid-Strike',
    'A high-speed freeze frame of an Indian Kingfisher emerging from calm river waters.',
    'image', 'https://images.unsplash.com/photo-1555169062-013468b47731?auto=format&fit=crop&w=1000&q=80',
    'approved', 98, 8, 1250
  ),
  (
    'f1000000-0000-0000-0000-000000000003', 'SUB-1003',
    'c0000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000003',
    'Dew Drops on a Praying Mantis',
    'Macro study of morning dew reflections on a green mantis in Valparai tea estates.',
    'image', 'https://images.unsplash.com/photo-1563281577-a7be47e20db9?auto=format&fit=crop&w=1000&q=80',
    'approved', 76, 5, 920
  ),
  (
    'f1000000-0000-0000-0000-000000000004', 'SUB-1004',
    'c0000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000004',
    'Sunset Flight of the Flamingos',
    'Silhouetted pink flamingos over the Pulicat lake brackish lagoons.',
    'image', 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=1000&q=80',
    'pending', 0, 0, 110
  )
ON CONFLICT (id) DO NOTHING;

-- 6. Sample Activity Logs
INSERT INTO dt_competition_activity_logs (competition_id, activity_type, actor_name, actor_email, description)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'COMPETITION_CREATED', 'Admin', 'admin@dtactics.io', 'Competition "Wildlife & Nature Photography 2026" was launched.'),
  ('c0000000-0000-0000-0000-000000000001', 'PARTICIPANT_REGISTERED', 'Arun Kumar', 'arun.photo@gmail.com', 'Arun Kumar registered for the competition.'),
  ('c0000000-0000-0000-0000-000000000001', 'SUBMISSION_APPROVED', 'Moderator', 'admin@dtactics.io', 'Submission SUB-1001 "Silent Stare of the Bengal Tigress" was approved.');
