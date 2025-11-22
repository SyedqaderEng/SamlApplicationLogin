import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

// Get SAML config
router.get('/', authenticate, async (_req: Request, res: Response) => {
  try {
    let config = await prisma.samlConfig.findFirst();

    if (!config) {
      // Create default config
      config = await prisma.samlConfig.create({
        data: {
          appRole: 'BOTH',
          defaultEntityId: process.env.SAML_ISSUER || 'http://localhost:3001',
        },
      });
    }

    // Don't expose private keys in response
return res.json({
      config: {
        id: config.id,
        appRole: config.appRole,
        defaultEntityId: config.defaultEntityId,
        hasSigningKey: !!config.signingKey,
        hasSigningCert: !!config.signingCert,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get config error:', error);
    return res.status(500).json({ error: 'Failed to get configuration' });
  }
});

// Update SAML config
router.put(
  '/',
  authenticate,
  [
    body('appRole').optional().isIn(['SP', 'IDP', 'BOTH']),
    body('defaultEntityId').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { appRole, defaultEntityId } = req.body;

      let config = await prisma.samlConfig.findFirst();

      const updateData: any = {};
      if (appRole) updateData.appRole = appRole;
      if (defaultEntityId) updateData.defaultEntityId = defaultEntityId;

      if (config) {
        config = await prisma.samlConfig.update({
          where: { id: config.id },
          data: updateData,
        });
      } else {
        config = await prisma.samlConfig.create({
          data: {
            appRole: appRole || 'BOTH',
            defaultEntityId: defaultEntityId || process.env.SAML_ISSUER || 'http://localhost:3001',
          },
        });
      }

return res.json({
        message: 'Configuration updated successfully',
        config: {
          id: config.id,
          appRole: config.appRole,
          defaultEntityId: config.defaultEntityId,
          hasSigningKey: !!config.signingKey,
          hasSigningCert: !!config.signingCert,
        },
      });
    } catch (error) {
      console.error('Update config error:', error);
      return res.status(500).json({ error: 'Failed to update configuration' });
    }
  }
);

// Get SAML logs
router.get('/logs', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { limit = '50', offset = '0', eventType, status } = req.query;

    const where: any = {};
    if (eventType) where.eventType = eventType;
    if (status) where.status = status;

    const logs = await prisma.samlLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      include: {
        user: {
          select: {
            email: true,
            displayName: true,
          },
        },
      },
    });

    const total = await prisma.samlLog.count({ where });

return res.json({
      logs,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    console.error('Get logs error:', error);
    return res.status(500).json({ error: 'Failed to get logs' });
  }
});

// Get single log entry
router.get('/logs/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const log = await prisma.samlLog.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            email: true,
            displayName: true,
          },
        },
      },
    });

    if (!log) {
      return res.status(404).json({ error: 'Log entry not found' });
    }

return res.json({ log });
  } catch (error) {
    console.error('Get log error:', error);
    return res.status(500).json({ error: 'Failed to get log entry' });
  }
});

// Clear logs
router.delete('/logs', authenticate, async (_req: Request, res: Response) => {
  try {
    const result = await prisma.samlLog.deleteMany({});

return res.json({
      message: 'Logs cleared successfully',
      deletedCount: result.count,
    });
  } catch (error) {
    console.error('Clear logs error:', error);
    return res.status(500).json({ error: 'Failed to clear logs' });
  }
});

export default router;
