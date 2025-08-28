/*
  # Add historical social media statistics
  
  1. Changes
    - Insert historical data for December 2024 through April 2025
    
  2. Data
    - Monthly follower counts and likes for:
      - Instagram
      - Facebook
      - LinkedIn
*/

INSERT INTO social_media_stats (month, instagram_followers, instagram_likes, facebook_followers, facebook_likes, linkedin_followers, linkedin_likes)
VALUES 
  ('2024-12-01', 120, 4, 322, 6, 84, 11),
  ('2025-01-01', 121, 30, 322, 38, 87, 8),
  ('2025-02-01', 127, 58, 323, 47, 87, 17),
  ('2025-03-01', 135, 23, 325, 25, 87, 8),
  ('2025-04-01', 143, 15, 325, 19, 88, 31)
ON CONFLICT (month) 
DO UPDATE SET
  instagram_followers = EXCLUDED.instagram_followers,
  instagram_likes = EXCLUDED.instagram_likes,
  facebook_followers = EXCLUDED.facebook_followers,
  facebook_likes = EXCLUDED.facebook_likes,
  linkedin_followers = EXCLUDED.linkedin_followers,
  linkedin_likes = EXCLUDED.linkedin_likes;