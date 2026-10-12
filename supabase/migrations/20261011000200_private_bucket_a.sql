-- Storage bucket "A" was created by hand in the dashboard and was public with no limits.
-- Make it private. (Kids' photos and uploads stay off the cloud; no bucket should be public by accident.)
update storage.buckets set public = false where id = 'A';
