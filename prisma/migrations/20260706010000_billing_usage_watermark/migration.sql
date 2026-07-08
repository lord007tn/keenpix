-- Usage-metering watermark: the reporter advances this after ingesting each
-- org's delivered-bytes delta to Polar, so the meter never double-counts.
ALTER TABLE "BillingCustomer" ADD COLUMN "lastUsageReportAt" TIMESTAMP(3);
