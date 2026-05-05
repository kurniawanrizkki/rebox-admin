# RE-BOX Admin

React admin site for managing:

- `compost_guides`
- `recycle_locations`
- `diy_projects`

## Run

1. Install dependencies: `npm install`
2. Create `.env` from `.env.example`
3. Start dev server: `npm run dev`

## Notes

- This app uses Supabase email/password auth.
- The mobile app in `../SmartTrashBin` reads the same content tables.
- Apply the SQL in `../SmartTrashBin/supabase/content-management.sql` before using the new compost guide management flow.
# rebox-admin
