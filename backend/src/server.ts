import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import prisma from './config/database';
import { initializeSp, getSp, createAuthnRequest } from './saml/samlSp';
import { initializeIdp, getIdp, createLoginResponse, parseAuthnRequest } from './saml/samlIdp';
import { handleAcsResponse } from './saml/acs';
import authRoutes from './api/auth';
import metadataRoutes from './api/metadata';
import configRoutes from './api/config';
import { optionalAuth, AuthRequest } from './middleware/authMiddleware';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Metadata routes
app.use('/api/metadata', metadataRoutes);

// Config routes
app.use('/api/config', configRoutes);

// ===================
// SAML SP ENDPOINTS
// ===================

// SP Metadata
app.get('/saml/metadata', async (req: Request, res: Response) => {
  try {
    const sp = await getSp();
    const metadata = sp.getMetadata();

    res.set('Content-Type', 'application/xml');
    res.send(metadata);
  } catch (error) {
    console.error('SP metadata error:', error);
    res.status(500).json({ error: 'Failed to generate SP metadata' });
  }
});

// SP Login - Initiate SAML authentication
app.get('/saml/login', async (req: Request, res: Response) => {
  try {
    const { idpEntityId } = req.query;

    if (!idpEntityId) {
      return res.status(400).json({ error: 'idpEntityId query parameter is required' });
    }

    const { context, entityEndpoint } = await createAuthnRequest(idpEntityId as string);

    // Log the login attempt
    await prisma.samlLog.create({
      data: {
        entityId: idpEntityId as string,
        eventType: 'sp_login',
        status: 'initiated',
        details: {
          entityEndpoint,
        },
      },
    });

    // Redirect to IdP
    res.redirect(entityEndpoint);
  } catch (error: any) {
    console.error('SP login error:', error);

    await prisma.samlLog.create({
      data: {
        entityId: req.query.idpEntityId as string || 'unknown',
        eventType: 'sp_login',
        status: 'failure',
        details: {
          error: error.message,
        },
      },
    });

    res.status(500).json({ error: error.message || 'SAML login failed' });
  }
});

// ACS - Assertion Consumer Service
app.post('/saml/acs', async (req: Request, res: Response) => {
  try {
    const result = await handleAcsResponse(req.body);

    if (result.success) {
      // Return the token in a way that the frontend can capture it
      // In production, you might want to set a cookie or redirect with the token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/saml/callback?token=${result.token}`);
    } else {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/saml/callback?error=${encodeURIComponent(result.error || 'Unknown error')}`);
    }
  } catch (error: any) {
    console.error('ACS error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/saml/callback?error=${encodeURIComponent(error.message)}`);
  }
});

// SLO - Single Logout
app.post('/saml/slo', async (req: Request, res: Response) => {
  try {
    // Log logout
    await prisma.samlLog.create({
      data: {
        eventType: 'logout',
        status: 'success',
        details: req.body,
      },
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('SLO error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ===================
// SAML IDP ENDPOINTS
// ===================

// IdP Metadata
app.get('/saml/idp/metadata', async (req: Request, res: Response) => {
  try {
    const idp = await getIdp();
    const metadata = idp.getMetadata();

    res.set('Content-Type', 'application/xml');
    res.send(metadata);
  } catch (error) {
    console.error('IdP metadata error:', error);
    res.status(500).json({ error: 'Failed to generate IdP metadata' });
  }
});

// IdP SSO - Single Sign-On
app.get('/saml/idp/sso', async (req: Request, res: Response) => {
  try {
    // Parse AuthnRequest if present
    let requestId: string | undefined;
    let relayState: string | undefined;

    if (req.query.SAMLRequest) {
      const parseResult = await parseAuthnRequest(req.query, 'redirect');
      requestId = parseResult.extract?.request?.id;
      relayState = req.query.RelayState as string;
    }

    // Store SAML request info in session/cookie for later
    res.cookie('saml_request_id', requestId || '', { httpOnly: true });
    res.cookie('saml_relay_state', relayState || '', { httpOnly: true });

    // Redirect to login page
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/idp-login${requestId ? `?requestId=${requestId}` : ''}`);
  } catch (error) {
    console.error('IdP SSO error:', error);
    res.status(500).json({ error: 'SSO failed' });
  }
});

// IdP SSO - POST binding
app.post('/saml/idp/sso', async (req: Request, res: Response) => {
  try {
    let requestId: string | undefined;
    let relayState: string | undefined;

    if (req.body.SAMLRequest) {
      const parseResult = await parseAuthnRequest(req.body, 'post');
      requestId = parseResult.extract?.request?.id;
      relayState = req.body.RelayState;
    }

    // Store SAML request info
    res.cookie('saml_request_id', requestId || '', { httpOnly: true });
    res.cookie('saml_relay_state', relayState || '', { httpOnly: true });

    // Redirect to login page
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/idp-login${requestId ? `?requestId=${requestId}` : ''}`);
  } catch (error) {
    console.error('IdP SSO POST error:', error);
    res.status(500).json({ error: 'SSO failed' });
  }
});

// IdP Login - After user authenticates
app.post('/saml/idp/login', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { spEntityId, email, password } = req.body;

    if (!spEntityId) {
      return res.status(400).json({ error: 'spEntityId is required' });
    }

    // Authenticate user (you can use local auth or get from JWT)
    let user;

    if (req.user) {
      // User is already authenticated via JWT
      user = await prisma.user.findUnique({
        where: { id: req.user.userId },
      });
    } else if (email && password) {
      // Authenticate with email/password
      const bcrypt = require('bcrypt');
      user = await prisma.user.findUnique({ where: { email } });

      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    } else {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Get request ID from cookie
    const requestId = req.cookies.saml_request_id;

    // Create SAML response
    const { context } = await createLoginResponse(
      {
        email: user.email,
        displayName: user.displayName || undefined,
        id: user.id,
      },
      spEntityId,
      requestId
    );

    // Log successful IdP login
    await prisma.samlLog.create({
      data: {
        entityId: spEntityId,
        userId: user.id,
        eventType: 'idp_login',
        status: 'success',
        details: {
          user: user.email,
          spEntityId,
        },
      },
    });

    // Get SP ACS URL
    const spEntity = await prisma.samlEntity.findUnique({
      where: { entityId: spEntityId },
    });

    if (!spEntity || spEntity.acsUrls.length === 0) {
      return res.status(400).json({ error: 'SP ACS URL not found' });
    }

    // Return HTML form that auto-submits to SP
    const acsUrl = spEntity.acsUrls[0];
    const relayState = req.cookies.saml_relay_state || '';

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>SAML Response</title>
      </head>
      <body onload="document.forms[0].submit()">
        <form method="post" action="${acsUrl}">
          <input type="hidden" name="SAMLResponse" value="${context}" />
          <input type="hidden" name="RelayState" value="${relayState}" />
          <noscript>
            <button type="submit">Continue</button>
          </noscript>
        </form>
      </body>
      </html>
    `);
  } catch (error: any) {
    console.error('IdP login error:', error);

    await prisma.samlLog.create({
      data: {
        entityId: req.body.spEntityId || 'unknown',
        eventType: 'idp_login',
        status: 'failure',
        details: {
          error: error.message,
        },
      },
    });

    res.status(500).json({ error: error.message || 'IdP login failed' });
  }
});

// IdP SLO - Single Logout
app.post('/saml/idp/slo', async (req: Request, res: Response) => {
  try {
    await prisma.samlLog.create({
      data: {
        eventType: 'logout',
        status: 'success',
        details: req.body,
      },
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('IdP SLO error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize SAML and start server
const startServer = async () => {
  try {
    // Initialize SAML SP and IdP
    await initializeSp();
    await initializeIdp();

    app.listen(PORT, () => {
      console.log(`🚀 SAML Test Platform Backend running on port ${PORT}`);
      console.log(`📋 SP Metadata: http://localhost:${PORT}/saml/metadata`);
      console.log(`📋 IdP Metadata: http://localhost:${PORT}/saml/idp/metadata`);
      console.log(`🔐 SP Login: http://localhost:${PORT}/saml/login?idpEntityId=<entityId>`);
      console.log(`🔐 IdP SSO: http://localhost:${PORT}/saml/idp/sso`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
