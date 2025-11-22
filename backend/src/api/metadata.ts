import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../config/database';
import { authenticate } from '../middleware/authMiddleware';
import { parseMetadata } from '../saml/metadata';
import { getSpMetadata } from '../saml/samlSp';
import { getIdpMetadata } from '../saml/samlIdp';
import { getCertificateFingerprint } from '../saml/certificates';

const router = Router();

// Import metadata
router.post(
  '/import',
  authenticate,
  [body('xml').notEmpty(), body('type').isIn(['SP', 'IDP'])],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { xml, type } = req.body;

      // Parse metadata
      const parsed = await parseMetadata(xml);

      // Verify type matches
      if (parsed.type !== type) {
        return res.status(400).json({
          error: `Metadata type mismatch. Expected ${type}, got ${parsed.type}`,
        });
      }

      // Check if entity already exists
      const existingEntity = await prisma.samlEntity.findUnique({
        where: { entityId: parsed.entityId },
      });

      let entity;
      if (existingEntity) {
        // Update existing entity
        entity = await prisma.samlEntity.update({
          where: { entityId: parsed.entityId },
          data: {
            type: parsed.type,
            rawXml: xml,
            parsedJson: JSON.parse(JSON.stringify(parsed)),
            ssoUrl: parsed.ssoUrl,
            sloUrl: parsed.sloUrl,
            acsUrls: parsed.acsUrls,
            certificates: parsed.certificates,
            active: true,
          },
        });
      } else {
        // Create new entity
        entity = await prisma.samlEntity.create({
          data: {
            type: parsed.type,
            entityId: parsed.entityId,
            rawXml: xml,
            parsedJson: JSON.parse(JSON.stringify(parsed)),
            ssoUrl: parsed.ssoUrl,
            sloUrl: parsed.sloUrl,
            acsUrls: parsed.acsUrls,
            certificates: parsed.certificates,
            active: true,
          },
        });
      }

      // Calculate certificate fingerprints
      const fingerprints = parsed.certificates.map((cert) =>
        getCertificateFingerprint(cert)
      );

      res.json({
        message: 'Metadata imported successfully',
        entity: {
          id: entity.id,
          type: entity.type,
          entityId: entity.entityId,
          ssoUrl: entity.ssoUrl,
          sloUrl: entity.sloUrl,
          acsUrls: entity.acsUrls,
          certificateFingerprints: fingerprints,
        },
      });
    } catch (error: any) {
      console.error('Import metadata error:', error);
      return res.status(500).json({ error: error.message || 'Failed to import metadata' });
    }
  }
);

// Get all entities
router.get('/entities', authenticate, async (_req: Request, res: Response) => {
  try {
    const entities = await prisma.samlEntity.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const entitiesWithFingerprints = entities.map((entity) => ({
      id: entity.id,
      type: entity.type,
      entityId: entity.entityId,
      ssoUrl: entity.ssoUrl,
      sloUrl: entity.sloUrl,
      acsUrls: entity.acsUrls,
      active: entity.active,
      createdAt: entity.createdAt,
      certificateFingerprints: entity.certificates.map((cert) =>
        getCertificateFingerprint(cert)
      ),
    }));

    res.json({ entities: entitiesWithFingerprints });
  } catch (error) {
    console.error('Get entities error:', error);
    return res.status(500).json({ error: 'Failed to get entities' });
  }
});

// Get entity by ID
router.get('/entities/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const entity = await prisma.samlEntity.findUnique({
      where: { id: req.params.id },
    });

    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    res.json({
      entity: {
        ...entity,
        certificateFingerprints: entity.certificates.map((cert) =>
          getCertificateFingerprint(cert)
        ),
      },
    });
  } catch (error) {
    console.error('Get entity error:', error);
    return res.status(500).json({ error: 'Failed to get entity' });
  }
});

// Export SP metadata
router.get('/export/sp', async (_req: Request, res: Response) => {
  try {
    const metadata = await getSpMetadata();
    res.set('Content-Type', 'application/xml');
    res.send(metadata);
  } catch (error) {
    console.error('Export SP metadata error:', error);
    return res.status(500).json({ error: 'Failed to export SP metadata' });
  }
});

// Export IdP metadata
router.get('/export/idp', async (_req: Request, res: Response) => {
  try {
    const metadata = await getIdpMetadata();
    res.set('Content-Type', 'application/xml');
    res.send(metadata);
  } catch (error) {
    console.error('Export IdP metadata error:', error);
    return res.status(500).json({ error: 'Failed to export IdP metadata' });
  }
});

// Delete entity
router.delete('/entities/:id', authenticate, async (req: Request, res: Response) => {
  try {
    await prisma.samlEntity.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Entity deleted successfully' });
  } catch (error) {
    console.error('Delete entity error:', error);
    return res.status(500).json({ error: 'Failed to delete entity' });
  }
});

// Toggle entity active status
router.patch('/entities/:id/toggle', authenticate, async (req: Request, res: Response) => {
  try {
    const entity = await prisma.samlEntity.findUnique({
      where: { id: req.params.id },
    });

    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    const updated = await prisma.samlEntity.update({
      where: { id: req.params.id },
      data: { active: !entity.active },
    });

    res.json({ entity: updated });
  } catch (error) {
    console.error('Toggle entity error:', error);
    return res.status(500).json({ error: 'Failed to toggle entity' });
  }
});

export default router;
