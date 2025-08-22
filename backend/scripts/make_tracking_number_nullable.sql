-- Script to make tracking_number nullable in the packages table
ALTER TABLE packages ALTER COLUMN tracking_number DROP NOT NULL;
