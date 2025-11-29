# Supabase Storage Setup for Photo Task Recognition

This guide will help you set up the Supabase storage bucket for temporary photo storage used by the AI Photo Task Recognition feature.

## Step 1: Create Storage Bucket

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"**
4. Configure the bucket:
   - **Name**: `task-photos`
   - **Public bucket**: ✅ **Yes** (checked)
   - **File size limit**: 20 MB
   - **Allowed MIME types**: `image/jpeg,image/png,image/gif,image/webp`
5. Click **"Create bucket"**

## Step 2: Set Up RLS Policies

After creating the bucket, you need to set up Row Level Security (RLS) policies to ensure users can only access their own photos.

### Policy 1: Allow users to upload their own photos

```sql
-- Allow authenticated users to upload photos to their own folder
CREATE POLICY "Users can upload photos to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'task-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Policy 2: Allow users to view their own photos

```sql
-- Allow authenticated users to view their own photos
CREATE POLICY "Users can view their own photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'task-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Policy 3: Allow users to delete their own photos

```sql
-- Allow authenticated users to delete their own photos
CREATE POLICY "Users can delete their own photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'task-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Policy 4: Allow public read access (optional, for temporary photos)

If you want photos to be publicly accessible (for faster loading), you can add:

```sql
-- Allow public read access to task-photos bucket
CREATE POLICY "Public can read task photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'task-photos');
```

**Note**: Since photos are stored temporarily and deleted after processing, public access is generally safe. However, if you prefer stricter security, you can skip this policy and only allow authenticated access.

## Step 3: Verify Setup

1. Go to **Storage** → **task-photos** bucket
2. Check that the bucket is **Public**
3. Verify that the policies are active in the **Policies** tab

## Step 4: Test the Feature

1. Open your app
2. Click the **Camera/Photo** button
3. Upload or take a photo of a to-do list
4. Verify that:
   - The photo uploads successfully
   - AI analysis works
   - Photos are stored in the `{user_id}/temp/` folder structure

## Storage Structure

Photos are stored with the following structure:
```
task-photos/
  └── {user_id}/
      └── temp/
          └── temp-{timestamp}.{extension}
```

Example:
```
task-photos/
  └── 123e4567-e89b-12d3-a456-426614174000/
      └── temp/
          └── temp-1703123456789.jpg
```

## Cleanup (Optional)

Since photos are temporary, you may want to set up automatic cleanup. You can create a database function to delete old photos:

```sql
-- Function to delete photos older than 24 hours
CREATE OR REPLACE FUNCTION cleanup_old_photos()
RETURNS void AS $$
BEGIN
  DELETE FROM storage.objects
  WHERE bucket_id = 'task-photos'
    AND name LIKE '%/temp/%'
    AND created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup (requires pg_cron extension)
-- Uncomment if you have pg_cron installed:
-- SELECT cron.schedule('cleanup-old-photos', '0 2 * * *', 'SELECT cleanup_old_photos()');
```

Alternatively, you can manually clean up old photos from the Supabase dashboard or implement client-side cleanup after successful task creation.

## Troubleshooting

### Error: "Bucket not found"
- Make sure the bucket name is exactly `task-photos` (case-sensitive)
- Verify the bucket exists in your Supabase project

### Error: "Permission denied"
- Check that RLS policies are correctly set up
- Verify the user is authenticated
- Ensure the storage path matches the user's ID

### Error: "File size exceeds limit"
- Check that the bucket's file size limit is set to at least 20 MB
- Verify the uploaded file is under 20 MB

### Photos not appearing
- Check browser console for errors
- Verify the bucket is set to **Public** if using public read access
- Check network tab to see if upload requests are successful

## Security Notes

- Photos are stored temporarily and should be deleted after processing
- The `temp/` folder structure helps organize temporary files
- RLS policies ensure users can only access their own photos
- Consider implementing automatic cleanup for photos older than 24 hours

## Next Steps

After setting up the storage bucket, the AI Photo Task Recognition feature should work seamlessly. Users can:
1. Take or upload photos of their to-do lists
2. AI will analyze and extract tasks
3. Review and edit detected tasks
4. Bulk add tasks to their workspace

The feature is now ready to use! 🎉

