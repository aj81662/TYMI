(async function(){
  function getMeta(name){
    const m = document.querySelector('meta[name="' + name + '"]');
    return m ? m.content : '';
  }

  // Try env.json at site root first (useful for local dev without editing HTML)
  let SUPABASE_URL = '';
  let SUPABASE_KEY = '';
  try {
    const r = await fetch('/env.json', {cache: 'no-store'});
    if (r.ok) {
      const j = await r.json();
      SUPABASE_URL = j.supabaseUrl || j.SUPABASE_URL || '';
      SUPABASE_KEY = j.supabaseKey || j.SUPABASE_KEY || '';
      // Optional service role key for quick local/dev operations (DO NOT ship this to production)
      window.__SUPABASE_SERVICE_ROLE = j.supabaseServiceKey || j.SUPABASE_SERVICE_ROLE || '';
      console.log('Loaded Supabase config from /env.json');
    }
  } catch (e) {
    // ignore fetch errors, will fall back to meta tags
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
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    // If a service role key was provided in env.json, expose a privileged client
    try {
      const svcKey = window.__SUPABASE_SERVICE_ROLE || getMeta('supabase-service-role');
      if (svcKey) {
        window.supabaseService = window.supabase.createClient(SUPABASE_URL, svcKey);
        console.warn('Supabase service-role client initialized in browser. This is insecure for production.');
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
