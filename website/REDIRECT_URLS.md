Supabase Redirect URLs — add these to the project owner's Supabase Dashboard

Please provide the URLs you want added; replace the examples below.

Production URLs (example):
- https://medbuddy.yourcompany.com
- https://your-domain.com

Development URLs (common local dev ports):
- http://localhost:3000
- http://localhost:19006   # Expo web default
- http://localhost:5173    # Vite (if used)

Notes for the owner:
- Add each URL under Supabase Dashboard → Authentication → URL Configuration → Redirect URLs.
- If you use Expo dev tunnels, include the tunnel URL when testing (they change per session).
- After adding URLs, ask the developer to re-run the auth flows and confirm login redirect behavior.

Please reply with your actual production URL(s) and any additional dev URLs you want included.