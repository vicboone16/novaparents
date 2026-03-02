-- No-op migration to force PostgREST schema cache reload
-- The redeem_agency_invite_code function already exists in the database
NOTIFY pgrst, 'reload schema';