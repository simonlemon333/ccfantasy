Put player images in this folder and update the `players.photo_url` field in the database.

Guidelines:
- File names: use lowercase and underscores, e.g. `erling_haaland.png`
- Preferred formats: .png or .jpg
- Use relative path in DB: `/players/erling_haaland.png`

Example SQL:

UPDATE players SET photo_url = '/players/erling_haaland.png' WHERE name ILIKE '%Haaland%';

After adding an image, refresh the app page to see it.
