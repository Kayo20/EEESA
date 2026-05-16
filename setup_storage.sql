-- Create the images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for the images bucket
DROP POLICY IF EXISTS "Images are publicly accessible" ON storage.objects;
CREATE POLICY "Images are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'images');

DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
CREATE POLICY "Authenticated users can upload images"
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'images'
    AND auth.uid()::text = split_part(name, '/', 1)
  );

DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
CREATE POLICY "Users can update their own images"
  ON storage.objects FOR UPDATE USING (
    bucket_id = 'images'
    AND auth.uid()::text = split_part(name, '/', 1)
  );

DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
CREATE POLICY "Users can delete their own images"
  ON storage.objects FOR DELETE USING (
    bucket_id = 'images'
    AND auth.uid()::text = split_part(name, '/', 1)
  );

-- Verify the bucket was created
SELECT id, name, public FROM storage.buckets WHERE id = 'images';