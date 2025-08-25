-- Policies for avatars storage
CREATE POLICY "authenticated_users_can_view_avatars"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'avatars' );

CREATE POLICY "authenticated_users_can_insert_avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'avatars' AND owner = auth.uid() );

CREATE POLICY "authenticated_users_can_update_avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'avatars' AND owner = auth.uid() );
