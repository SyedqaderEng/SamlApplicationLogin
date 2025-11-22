import * as samlify from 'samlify';
import prisma from '../config/database';
import { generateSelfSignedCertificate } from './certificates';
import { SAML_CONFIG } from '../config/saml';

let idpInstance: samlify.IdentityProviderInstance | null = null;
let certificateInfo: { privateKey: string; certificate: string } | null = null;

export const initializeIdp = async (): Promise<samlify.IdentityProviderInstance> => {
  if (idpInstance) {
    return idpInstance;
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

    // Create IdP instance
    idpInstance = samlify.IdentityProvider({
      entityID: samlConfig.defaultEntityId,
      wantAuthnRequestsSigned: false,
      privateKey: samlConfig.signingKey || certificateInfo.privateKey,
      privateKeyPass: '',
      isAssertionEncrypted: false,
      messageSigningOrder: 'encrypt-then-sign',
      singleSignOnService: [
        {
          Binding: samlify.Constants.namespace.binding.post,
          Location: SAML_CONFIG.idpSsoUrl,
        },
        {
          Binding: samlify.Constants.namespace.binding.redirect,
          Location: SAML_CONFIG.idpSsoUrl,
        },
      ],
      singleLogoutService: [
        {
          Binding: samlify.Constants.namespace.binding.post,
          Location: `${SAML_CONFIG.issuer}/saml/idp/slo`,
        },
      ],
      nameIDFormat: ['urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'],
    });

    console.log('SAML IdP initialized successfully');
    return idpInstance;
  } catch (error) {
    console.error('Error initializing SAML IdP:', error);
    throw error;
  }
};

export const getIdp = async (): Promise<samlify.IdentityProviderInstance> => {
  if (!idpInstance) {
    return await initializeIdp();
  }
  return idpInstance;
};

export const createSpFromMetadata = async (metadata: string): Promise<samlify.ServiceProviderInstance> => {
  try {
    const sp = samlify.ServiceProvider({ metadata });
    return sp;
  } catch (error) {
    console.error('Error creating SP from metadata:', error);
    throw new Error('Failed to create SP from metadata');
  }
};

export const getIdpMetadata = async (): Promise<string> => {
  const idp = await getIdp();
  return idp.getMetadata();
};

export const parseAuthnRequest = async (
  request: any,
  type: 'post' | 'redirect' = 'redirect'
): Promise<{ extract: any }> => {
  try {
    const idp = await getIdp();

    // For parsing, we need an SP instance
    // Try to get from database or create a minimal one
    const spEntity = await prisma.samlEntity.findFirst({
      where: { type: 'SP', active: true },
    });

    let sp: samlify.ServiceProviderInstance;

    if (spEntity) {
      sp = samlify.ServiceProvider({ metadata: spEntity.rawXml });
    } else {
      // Create a minimal SP for validation
      generateSelfSignedCertificate('./certs'); // Ensure certs exist
      sp = samlify.ServiceProvider({
        entityID: SAML_CONFIG.issuer,
        authnRequestsSigned: false,
        wantAssertionsSigned: true,
        assertionConsumerService: [
          {
            Binding: samlify.Constants.namespace.binding.post,
            Location: SAML_CONFIG.callbackUrl,
          },
        ],
      });
    }

    const parseResult = await idp.parseLoginRequest(sp, type, request);
    return parseResult;
  } catch (error) {
    console.error('Error parsing AuthnRequest:', error);
    throw error;
  }
};

export const createLoginResponse = async (
  user: { email: string; displayName?: string; id: string },
  spEntityId: string,
  requestId?: string
): Promise<{ context: string }> => {
  try {
    const idp = await getIdp();

    // Get SP from database
    const spEntity = await prisma.samlEntity.findUnique({
      where: { entityId: spEntityId },
    });

    if (!spEntity || spEntity.type !== 'SP') {
      throw new Error('SP not found');
    }

    const sp = samlify.ServiceProvider({ metadata: spEntity.rawXml });

    // Create SAML attributes
    const attributes: { [key: string]: any } = {
      email: user.email,
      name: user.displayName || user.email,
      uid: user.id,
    };

    // Create login response
    const result: any = (idp as any).createLoginResponse(
      sp,
      {
        extract: {
          request: {
            id: requestId,
          },
        },
      },
      'post',
      { email: user.email }, // NameID as object
      attributes
    );

    return { context: result.context || result };
  } catch (error) {
    console.error('Error creating login response:', error);
    throw error;
  }
};
