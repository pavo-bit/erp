#!/bin/bash
# scripts/audit-secrets.sh
# 
# Scans the full git history for potentially leaked secrets to identify
# what needs to be rotated before migrating to AWS Secrets Manager.

echo "🔍 Starting Git History Secrets Audit..."

# Patterns to scan for
# - PostgreSQL URLs (postgresql://user:pass...)
# - Razorpay Live Keys (rzp_live_...)
# - Razorpay Test Keys (rzp_test_...)
# - RSA Private Keys (-----BEGIN RSA PRIVATE KEY-----)
# - RSA Public Keys (-----BEGIN PUBLIC KEY-----)
PATTERNS="postgresql://\|rzp_live_\|rzp_test_\|-----BEGIN RSA PRIVATE KEY-----\|-----BEGIN PRIVATE KEY-----\|-----BEGIN PUBLIC KEY-----"

# Use git log -p to search through all patches
# The -S option searches for the string, but we want regex pattern matching,
# so we use git rev-list and git grep.
echo "Scanning for patterns: $PATTERNS"
echo "--------------------------------------------------------"

git rev-list --all | (
    while read commit; do
        git grep -E "$PATTERNS" $commit
    done
) | sort -u | while read match; do
    echo "⚠️  Found potential secret match:"
    echo "$match"
    echo "--------------------------------------------------------"
done

echo "✅ Scan complete."
echo "Any matches found above should be considered COMPROMISED if pushed to a public/shared remote."
echo "Please ROTATE these credentials before placing them into AWS Secrets Manager."
