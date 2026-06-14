import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

// Validation Schemas
const createCountrySchema = z.object({
  code: z.string().min(2).max(5),
  name: z.string().min(2),
  isActive: z.boolean().default(true),
});

const createStateSchema = z.object({
  countryId: z.string(),
  code: z.string().min(2),
  name: z.string().min(2),
  isActive: z.boolean().default(true),
});

const createCitySchema = z.object({
  stateId: z.string(),
  name: z.string().min(2),
  isActive: z.boolean().default(true),
});

const simpleMdmSchema = z.object({
  name: z.string().min(2),
  isActive: z.boolean().default(true),
});

const advancedMdmSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

// =====================================
// READ-ONLY ROUTES (Accessible by ANY authenticated user/tenant)
// =====================================

router.get('/countries', authenticate, async (req: AuthRequest, res: Response) => {
  const data = await prisma.masterCountry.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  res.json({ success: true, data });
});

router.get('/states', authenticate, async (req: AuthRequest, res: Response) => {
  const { countryId } = req.query;
  const whereClause = { isActive: true, ...(countryId ? { countryId: String(countryId) } : {}) };
  const data = await prisma.masterState.findMany({ where: whereClause, orderBy: { name: 'asc' } });
  res.json({ success: true, data });
});

router.get('/cities', authenticate, async (req: AuthRequest, res: Response) => {
  const { stateId } = req.query;
  const whereClause = { isActive: true, ...(stateId ? { stateId: String(stateId) } : {}) };
  const data = await prisma.masterCity.findMany({ where: whereClause, orderBy: { name: 'asc' } });
  res.json({ success: true, data });
});

router.get('/religions', authenticate, async (req: AuthRequest, res: Response) => {
  const data = await prisma.masterReligion.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  res.json({ success: true, data });
});

router.get('/categories', authenticate, async (req: AuthRequest, res: Response) => {
  const data = await prisma.masterCategory.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  res.json({ success: true, data });
});

router.get('/subjects', authenticate, async (req: AuthRequest, res: Response) => {
  const data = await prisma.masterSubject.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  res.json({ success: true, data });
});

router.get('/departments', authenticate, async (req: AuthRequest, res: Response) => {
  const data = await prisma.masterDepartment.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  res.json({ success: true, data });
});

// =====================================
// WRITE ROUTES (Strictly SUPER_ADMIN only)
// =====================================

const superAdminOnly = requireRole(Role.SUPER_ADMIN);

// Countries
router.post('/countries', authenticate, superAdminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const data = createCountrySchema.parse(req.body);
    const result = await prisma.masterCountry.create({ data });
    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// States
router.post('/states', authenticate, superAdminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const data = createStateSchema.parse(req.body);
    const result = await prisma.masterState.create({ data });
    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Cities
router.post('/cities', authenticate, superAdminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const data = createCitySchema.parse(req.body);
    const result = await prisma.masterCity.create({ data });
    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Religions
router.post('/religions', authenticate, superAdminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const data = simpleMdmSchema.parse(req.body);
    const result = await prisma.masterReligion.create({ data });
    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Categories
router.post('/categories', authenticate, superAdminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const data = simpleMdmSchema.parse(req.body);
    const result = await prisma.masterCategory.create({ data });
    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Subjects
router.post('/subjects', authenticate, superAdminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const data = advancedMdmSchema.parse(req.body);
    const result = await prisma.masterSubject.create({ data });
    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Departments
router.post('/departments', authenticate, superAdminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const data = advancedMdmSchema.parse(req.body);
    const result = await prisma.masterDepartment.create({ data });
    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Deactivate Master Record (Generic DELETE endpoint example)
router.delete('/:entity/:id', authenticate, superAdminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { entity, id } = req.params;
    let modelName: any;

    switch(entity) {
      case 'countries': modelName = prisma.masterCountry; break;
      case 'states': modelName = prisma.masterState; break;
      case 'cities': modelName = prisma.masterCity; break;
      case 'religions': modelName = prisma.masterReligion; break;
      case 'categories': modelName = prisma.masterCategory; break;
      case 'subjects': modelName = prisma.masterSubject; break;
      case 'departments': modelName = prisma.masterDepartment; break;
      default: return res.status(400).json({ success: false, error: 'Invalid entity' });
    }

    const result = await modelName.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
