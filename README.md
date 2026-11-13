# 🎓 SSVM College Square - School Management Platform

> **Modern, Full-Featured School Management System with Gallery**

[![Docker](https://img.shields.io/badge/Docker-Enabled-blue)]()
[![Gallery](https://img.shields.io/badge/Gallery-16%20Demo%20Images-orange)]()

---

## Current status

The repository is under active security, tenant-isolation, finance and release-readiness remediation. It has not passed a clean-install, full-suite or production-readiness review. Do not use it with real school data or live financial operations until the release gates in `docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md` are complete.

For local development prerequisites and current limitations, see `docs/CLEAN_INSTALLATION_GUIDE.md`.

---

## 📚 Complete Documentation

**👉 See:** [`SSVM-PROJECT-DOCUMENTATION.md`](SSVM-PROJECT-DOCUMENTATION.md)

This file contains everything:
- Complete setup instructions
- Gallery system guide
- API documentation
- Troubleshooting
- Architecture details
- All commands and scripts

---

## 🔐 Initial access

This repository does not provide default production-capable login credentials. Older examples referencing `admin@ssvm-cuttack.org / admin123` are stale and must not be used. Provision accounts through the documented local bootstrap (`ALLOW_DEMO_SEED=true` + `SEED_SUPER_ADMIN_EMAIL` + a password of at least 16 characters, non-production `NODE_ENV`) and use unique credentials in a controlled development database. See `docs/CLEAN_INSTALLATION_GUIDE.md`.

---

## 📸 Gallery System

✅ **16 professional demo images** pre-loaded  
✅ **Admin upload/delete control**  
✅ **5 categories** with filtering  
✅ **Responsive design**  

**Admin Gallery:** http://localhost:3000/admin/gallery

---

## 🛠️ Helper Scripts

| Script | Purpose |
|--------|---------|
| **start-docker.bat** | Start all containers |
| **check-docker-status.bat** | Check if Docker is ready |
| **test-connections.bat** | Verify all connections |

---

## 🌐 URLs

- **Backend API:** http://localhost:5000 (health: /health)
- **ERP Admin:** http://localhost:3005
- **Super Admin:** http://localhost:3003
- **Teacher Portal:** http://localhost:3004
- **Student Portal:** http://localhost:3000
- **Parent Portal:** http://localhost:3006
- **Payment Portal:** http://localhost:3007
- **SaaS Frontend:** http://localhost:3008

---

## 📞 Need Help?

1. **Check Docker:** `check-docker-status.bat`
2. **Test Connections:** `test-connections.bat`
3. **View Logs:** `docker compose logs -f`
4. **Read Docs:** [`SSVM-PROJECT-DOCUMENTATION.md`](SSVM-PROJECT-DOCUMENTATION.md)

---

*Built with ❤️ for SSVM College Square, Cuttack*
