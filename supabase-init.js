(async function(){
  // Keep a single anon client per page to avoid duplicate GoTrue instances.
  if (window.supabaseClient) {
    return;
  }

  function getMeta(name){
    const m = document.querySelector('meta[name="' + name + '"]');
    return m ? m.content : '';
  }

  // Try env.json in several likely locations (depends on static server root).
  let SUPABASE_URL = '';
  let SUPABASE_KEY = '';
  const envCandidates = ['/env.json', './env.json', '../env.json'];
  for (const envPath of envCandidates) {
    if (SUPABASE_URL && SUPABASE_KEY) break;
    try {
      const r = await fetch(envPath, { cache: 'no-store' });
      if (r.ok) {
        const j = await r.json();
        SUPABASE_URL = j.supabaseUrl || j.SUPABASE_URL || '';
        SUPABASE_KEY = j.supabaseKey || j.SUPABASE_KEY || '';
        // Optional service role key for quick local/dev operations (DO NOT ship this to production)
        window.__SUPABASE_SERVICE_ROLE = j.supabaseServiceKey || j.SUPABASE_SERVICE_ROLE || '';
        console.log('Loaded Supabase config from ' + envPath);
      }
    } catch (e) {
      // keep trying candidates
    }
  }

  // Fallback to meta tags
  if (!SUPABASE_URL) SUPABASE_URL = getMeta('supabase-url');
  if (!SUPABASE_KEY) SUPABASE_KEY = getMeta('supabase-key');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('Supabase configuration not found. Add /env.json or <meta name="supabase-url"> and <meta name="supabase-key"> to index.html.');
    return;
  }

  if (!window.supabase) {
    console.warn('Supabase SDK not found on window. Ensure the CDN script is loaded before this script.');
  }

  try {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    // If explicitly allowed, initialize service role client (unsafe in browser).
    try {
      const svcKey = window.__SUPABASE_SERVICE_ROLE || getMeta('supabase-service-role');
      const allowBrowserServiceRole = String(getMeta('supabase-allow-service-role') || '').toLowerCase() === 'true';
      if (svcKey && allowBrowserServiceRole) {
        window.supabaseService = window.supabase.createClient(SUPABASE_URL, svcKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
            storageKey: 'sb-service-role',
          },
        });
        console.warn('Supabase service-role client initialized in browser (opt-in). This is insecure for production.');
      } else if (svcKey) {
        console.warn('Service role key found, but browser service-role client is disabled by default.');
      }
    } catch (e) {
      console.warn('Failed to initialize service-role client:', e);
    }
    window.testSupabase = async function() {
      try {
        const { data, error } = await window.supabaseClient.from('profiles').select('*').limit(5);
        if (error) console.error('Supabase test error:', error);
        else console.log('Supabase test data:', data);
      } catch (err) {
        console.error('Supabase test exception:', err);
      }
    };
    console.log('Supabase client initialized. Call testSupabase() to verify.');
  } catch (e) {
    console.error('Failed to initialize Supabase client:', e);
  }
})();
