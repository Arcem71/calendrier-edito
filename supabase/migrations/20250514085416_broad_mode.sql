/*
  # Add informations column to editorial calendar
  
  1. Changes
    - Add `informations` text column to `editorial_calendar` table
*/

ALTER TABLE editorial_calendar 
ADD COLUMN IF NOT EXISTS informations text;