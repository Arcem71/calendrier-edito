/*
  # Add May 2025 Statistics
  
  1. Changes
    - Insert social media statistics for May 2025
    - Use ON CONFLICT to handle potential duplicates
*/

INSERT INTO social_media_stats (month, instagram_followers, instagram_likes, facebook_followers, facebook_likes, linkedin_followers, linkedin_likes)
VALUES 
  ('2025-05-01', 144, 42, 326, 42, 89, 11)
ON CONFLICT (month) 
DO UPDATE SET
  instagram_followers = EXCLUDED.instagram_followers,
  instagram_likes = EXCLUDED.instagram_likes,
  facebook_followers = EXCLUDED.facebook_followers,
  facebook_likes = EXCLUDED.facebook_likes,
  linkedin_followers = EXCLUDED.linkedin_followers,
  linkedin_likes = EXCLUDED.linkedin_likes;