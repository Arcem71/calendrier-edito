/*
  # Add missing months statistics and fix duplicates
  
  1. Changes
    - Add June and July 2025 statistics
    - Ensure no duplicate months exist
    
  2. Data
    - June 2025: Updated follower counts and engagement
    - July 2025: Latest statistics
*/

-- Add missing months data
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

-- Remove any potential duplicate entries (keeping the most recent)
WITH duplicates AS (
  SELECT month, 
         ROW_NUMBER() OVER (PARTITION BY month ORDER BY created_at DESC) as rn
  FROM social_media_stats
)
DELETE FROM social_media_stats 
WHERE id IN (
  SELECT s.id 
  FROM social_media_stats s
  JOIN duplicates d ON s.month = d.month
  WHERE d.rn > 1
);