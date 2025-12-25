DNS Records Template — replace placeholders with Railway targets

When Railway gives you the target hostnames for each service, replace <RAILWAY_FRONTEND_TARGET> and <RAILWAY_BACKEND_TARGET> with the values Railway provides and add these records to your DNS provider.

1) Cloudflare
- Root domain (leadgenie.online) -> signup static (if Cloudflare supports CNAME flattening)
  - Type: CNAME
  - Name: @
  - Target: <RAILWAY_FRONTEND_TARGET>
  - TTL: Auto
  - Proxy status: DNS only (orange cloud OFF)

- Subdomain (app.leadgenie.online) -> dashboard
  - Type: CNAME
  - Name: app
  - Target: <RAILWAY_BACKEND_TARGET>
  - TTL: Auto
  - Proxy status: DNS only (orange cloud OFF)

Notes: Cloudflare's proxying can break verification of ownership or TLS; use DNS only when mapping to Railway endpoints unless Railway instructs otherwise.

2) Amazon Route53 (example using CNAME for subdomain; for root use Alias record to the Railway-provided A/ALIAS if available)
- app.leadgenie.online
  - Record type: CNAME
  - Name: app
  - Value: <RAILWAY_BACKEND_TARGET>
  - TTL: 300

- leadgenie.online (root)
  - If Railway provides an A IP: create A records pointing to the IP(s) provided.
  - If Railway provides a hostname and Route53 supports ALIAS to external name, create an Alias (A) record to the Railway target. Otherwise add a CNAME for `www` and redirect root to `www`.

3) Namecheap / other providers (CNAME flattening / ANAME/ALIAS)
- Root/ANAME (if your provider supports ANAME/ALIAS)
  - Type: ALIAS/ANAME
  - Host: @
  - Value: <RAILWAY_FRONTEND_TARGET>

- app.leadgenie.online
  - Type: CNAME
  - Host: app
  - Value: <RAILWAY_BACKEND_TARGET>

4) Example lines to paste into a panel (replace placeholders):

Cloudflare - Signup static (root)
CNAME @ -> <RAILWAY_FRONTEND_TARGET>

Cloudflare - Dashboard
CNAME app -> <RAILWAY_BACKEND_TARGET>

Route53 - Dashboard
Name: app.leadgenie.online.  Type: CNAME  Value: <RAILWAY_BACKEND_TARGET>  TTL: 300

Route53 - Signup (if IPs provided by Railway, create A)
Name: leadgenie.online.  Type: A  Value: <RAILWAY_FRONTEND_IP>  TTL: 300

5) After adding records
- Wait for DNS propagation (a few minutes to an hour).
- In Railway UI map the custom domain to the service and verify.
- Ensure Railway issues TLS certs (Railway will typically manage this).

If you paste the actual Railway target hostnames here, I can render the exact records for each provider ready to paste into your DNS panel.
