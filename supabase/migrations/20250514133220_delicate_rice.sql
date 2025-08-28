/*
  # Remove Instagram Stats Table and Related Objects
  
  1. Changes
    - Drop instagram_stats table
    - Remove associated RLS policies
*/

DROP TABLE IF EXISTS public.instagram_stats;