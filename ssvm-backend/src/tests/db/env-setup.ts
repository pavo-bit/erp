const testDatabaseUrl = process.env.DATABASE_URL_TEST || "postgresql://ssvm_app:app_pw@127.0.0.1:5433/ssvm_test?schema=public";
process.env.DATABASE_URL = testDatabaseUrl;
process.env.DATABASE_URL_TEST = testDatabaseUrl;

if (!process.env.DATABASE_URL_AUTH) {
  process.env.DATABASE_URL_AUTH = "postgresql://ssvm_auth:authpassword@127.0.0.1:5433/ssvm_test?schema=public";
}
if (!process.env.DATABASE_URL_TRUSTED) {
  process.env.DATABASE_URL_TRUSTED = "postgresql://ssvm_trusted:trustedpassword@127.0.0.1:5433/ssvm_test?schema=public";
}
if (!process.env.DATABASE_URL_TEST_FIXTURE) {
  process.env.DATABASE_URL_TEST_FIXTURE = "postgresql://ssvm_fixture:fixture_pw@127.0.0.1:5433/ssvm_test?schema=public";
}
if (!process.env.REDIS_URL || process.env.REDIS_URL.includes("redis:6379")) {
  process.env.REDIS_URL = "redis://127.0.0.1:6379";
}
