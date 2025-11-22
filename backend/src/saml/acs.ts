import prisma from '../config/database';
import { parseLoginResponse } from './samlSp';
import { generateToken } from '../config/jwt';

export interface AcsResult {
  success: boolean;
  token?: string;
  user?: any;
  error?: string;
}

export const handleAcsResponse = async (samlResponse: any): Promise<AcsResult> => {
  try {
    // Parse the SAML response
    const parseResult = await parseLoginResponse({ body: samlResponse }, 'post');

    const extract = parseResult.extract;
    const nameId = extract.nameID;
    const attributes = extract.attributes;

    console.log('SAML Response parsed:', {
      nameId,
      attributes,
    });

    // Find or create user based on SAML NameID
    let user = await prisma.user.findFirst({
      where: { samlNameId: nameId },
    });

    if (!user) {
      // Try to find by email
      const email = attributes?.email || nameId;
      user = await prisma.user.findUnique({
        where: { email },
      });

      if (user) {
        // Update existing user with SAML info
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            samlNameId: nameId,
            samlEntityId: extract.issuer,
            samlAttributes: attributes || {},
            lastLoginAt: new Date(),
          },
        });
      } else {
        // Create new user from SAML attributes
        user = await prisma.user.create({
          data: {
            email: attributes?.email || nameId,
            passwordHash: '', // No password for SAML users
            displayName: attributes?.name || attributes?.displayName || nameId,
            samlNameId: nameId,
            samlEntityId: extract.issuer,
            samlAttributes: attributes || {},
            lastLoginAt: new Date(),
          },
        });
      }
    } else {
      // Update last login
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          samlAttributes: attributes || {},
        },
      });
    }

    // Log successful SAML login
    await prisma.samlLog.create({
      data: {
        entityId: extract.issuer,
        userId: user.id,
        eventType: 'acs',
        status: 'success',
        details: {
          nameId,
          attributes,
          issuer: extract.issuer,
        },
      },
    });

    // Generate JWT token
    const token = generateToken({ userId: user.id, email: user.email });

    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        samlNameId: user.samlNameId,
        samlEntityId: user.samlEntityId,
      },
    };
  } catch (error: any) {
    console.error('ACS error:', error);

    // Log failed SAML login
    await prisma.samlLog.create({
      data: {
        entityId: 'unknown',
        eventType: 'acs',
        status: 'failure',
        details: {
          error: error.message,
          stack: error.stack,
        },
      },
    });

    return {
      success: false,
      error: error.message || 'SAML authentication failed',
    };
  }
};
