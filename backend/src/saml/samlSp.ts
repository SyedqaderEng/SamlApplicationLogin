import * as samlify from 'samlify';
import prisma from '../config/database';
import { generateSelfSignedCertificate } from './certificates';
import { SAML_CONFIG } from '../config/saml';

let spInstance: samlify.ServiceProviderInstance | null = null;
let certificateInfo: { privateKey: string; certificate: string } | null = null;

export const initializeSp = async (): Promise<samlify.ServiceProviderInstance> => {
  if (spInstance) {
    return spInstance;
  }

  try {
    // Get or generate certificates
    certificateInfo = generateSelfSignedCertificate('./certs');

    // Get or create SAML config
    let samlConfig = await prisma.samlConfig.findFirst();

    if (!samlConfig) {
      samlConfig = await prisma.samlConfig.create({
        data: {
          appRole: 'BOTH',
          defaultEntityId: SAML_CONFIG.issuer,
          signingKey: certificateInfo.privateKey,
          signingCert: certificateInfo.certificate,
        },
      });
    }

    // Create SP instance
    spInstance = samlify.ServiceProvider({
      entityID: samlConfig.defaultEntityId,
      authnRequestsSigned: true,
      wantAssertionsSigned: true,
      wantMessageSigned: true,
      wantLogoutResponseSigned: true,
      wantLogoutRequestSigned: true,
      privateKey: samlConfig.signingKey || certificateInfo.privateKey,
      privateKeyPass: '',
      isAssertionEncrypted: false,
      assertionConsumerService: [
        {
          Binding: samlify.Constants.namespace.binding.post,
          Location: SAML_CONFIG.callbackUrl,
        },
      ],
      singleLogoutService: [
        {
          Binding: samlify.Constants.namespace.binding.post,
          Location: `${SAML_CONFIG.issuer}/saml/slo`,
        },
      ],
      nameIDFormat: ['urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'],
    });

    console.log('SAML SP initialized successfully');
    return spInstance;
  } catch (error) {
    console.error('Error initializing SAML SP:', error);
    throw error;
  }
};

export const getSp = async (): Promise<samlify.ServiceProviderInstance> => {
  if (!spInstance) {
    return await initializeSp();
  }
  return spInstance;
};

export const createIdpFromMetadata = async (metadata: string): Promise<samlify.IdentityProviderInstance> => {
  try {
    const idp = samlify.IdentityProvider({ metadata });
    return idp;
  } catch (error) {
    console.error('Error creating IdP from metadata:', error);
    throw new Error('Failed to create IdP from metadata');
  }
};

export const getSpMetadata = async (): Promise<string> => {
  const sp = await getSp();
  return sp.getMetadata();
};

export const createAuthnRequest = async (idpEntityId: string): Promise<{ context: string; entityEndpoint: string }> => {
  try {
    const sp = await getSp();

    // Get IdP from database
    const idpEntity = await prisma.samlEntity.findUnique({
      where: { entityId: idpEntityId },
    });

    if (!idpEntity || idpEntity.type !== 'IDP') {
      throw new Error('IdP not found');
    }

    const idp = samlify.IdentityProvider({ metadata: idpEntity.rawXml });

    const result: any = sp.createLoginRequest(idp, 'redirect');

    return {
      context: result.context || result.id,
      entityEndpoint: result.entityEndpoint || idpEntity.ssoUrl || ''
    };
  } catch (error) {
    console.error('Error creating AuthnRequest:', error);
    throw error;
  }
};

export const parseLoginResponse = async (
  response: any,
  type: 'post' | 'redirect' = 'post'
): Promise<{ extract: any }> => {
  try {
    const sp = await getSp();

    // For now, we'll use a mock IdP for parsing
    // In production, you'd get the actual IdP from the database
    const idpEntity = await prisma.samlEntity.findFirst({
      where: { type: 'IDP', active: true },
    });

    let idp: samlify.IdentityProviderInstance;

    if (idpEntity) {
      idp = samlify.IdentityProvider({ metadata: idpEntity.rawXml });
    } else {
      // Create a minimal IdP for validation
      const certificateInfo = generateSelfSignedCertificate('./certs');
      idp = samlify.IdentityProvider({
        entityID: SAML_CONFIG.issuer,
        singleSignOnService: [
          {
            Binding: samlify.Constants.namespace.binding.post,
            Location: SAML_CONFIG.idpSsoUrl,
          },
        ],
        wantAuthnRequestsSigned: false,
        privateKey: certificateInfo.privateKey,
        isAssertionEncrypted: false,
      });
    }

    const parseResult = await sp.parseLoginResponse(idp, type, response);
    return parseResult;
  } catch (error) {
    console.error('Error parsing login response:', error);
    throw error;
  }
};
