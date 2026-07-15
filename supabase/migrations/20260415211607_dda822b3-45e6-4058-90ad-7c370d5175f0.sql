-- Restrict kb-images: allow SELECT by direct path only
DROP POLICY IF EXISTS "Anyone can view KB images" ON storage.objects;
CREATE POLICY "Anyone can view KB images by path"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'kb-images');

-- Restrict company-assets: allow SELECT by direct path only
DROP POLICY IF EXISTS "Anyone can view company assets" ON storage.objects;
CREATE POLICY "Anyone can view company assets by path"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'company-assets');