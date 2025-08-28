/*
  # Fix duplicate months and add missing data
  
  1. Changes
    - Remove duplicate May entries
    - Add missing June and July 2025 data
    - Ensure proper chronological order
    
  2. Data
    - June 2025: 148 Instagram followers, 35 likes, 328 Facebook followers, 28 likes, 91 LinkedIn followers, 19 likes
    - July 2025: 152 Instagram followers, 41 likes, 330 Facebook followers, 33 likes, 93 LinkedIn followers, 24 likes
*/

-- First, remove any duplicate entries for the same month (keeping the most recent)
WITH duplicates AS (
  SELECT id, month, 
         ROW_NUMBER() OVER (PARTITION BY month ORDER BY created_at DESC) as rn
  FROM social_media_stats
)
DELETE FROM social_media_stats 
WHERE id IN (
  SELECT id 
  FROM duplicates
  WHERE rn > 1
);

-- Add missing months data with proper upsert
INSERT INTO social_media_stats (month, instagram_followers, instagram_likes, facebook_followers, facebook_likes, linkedin_followers, linkedin_likes)
VALUES 
  ('2025-06-01', 148, 35, 328, 28, 91, 19),
  ('2025-07-01', 152, 41, 330, 33, 93, 24)
ON CONFLICT (month) 
DO UPDATE SET
  instagram_followers = EXCLUDED.instagram_followers,
  instagram_likes = EXCLUDED.instagram_likes,
  facebook_followers = EXCLUDED.facebook_followers,
  facebook_likes = EXCLUDED.facebook_likes,
  linkedin_followers = EXCLUDED.linkedin_followers,
  linkedin_likes = EXCLUDED.linkedin_likes;