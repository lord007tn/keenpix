-- Email is now configured entirely from environment variables
-- (EMAIL_PROVIDER + provider-specific vars: POSTMARK_*, RESEND_*, or SMTP_*).
-- The database-backed SMTP settings table and its admin UI are removed, so drop
-- the now-unused table. Self-host installs that previously stored SMTP settings
-- in the database must move those values to SMTP_* env vars and set
-- EMAIL_PROVIDER=smtp.
DROP TABLE IF EXISTS "SmtpSettings";
