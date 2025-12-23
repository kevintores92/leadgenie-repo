Marketplace routes

- `GET /marketplace/numbers` — list provisioned sending numbers for the org (requires `x-organization-id` header)
- `POST /marketplace/add` — provision numbers for the org. Body: `{ marketplace?: string, count?: number, areaCode?: string }`.

Behavior:
- By default, the endpoint provisions `5` numbers for `STARTER` orgs and `10` for `PRO` orgs (per purchase) unless `count` is specified.
- In development, set `FAKE_TWILIO=1` to skip real Twilio calls and create fake numbers.

Note: purchasing real numbers uses the Twilio REST API and requires `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` to be set.
