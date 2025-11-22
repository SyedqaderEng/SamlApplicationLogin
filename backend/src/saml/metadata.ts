import * as xml2js from 'xml2js';
import { formatCertificate } from './certificates';

export interface ParsedMetadata {
  entityId: string;
  ssoUrl?: string;
  sloUrl?: string;
  acsUrls: string[];
  certificates: string[];
  type: 'SP' | 'IDP';
}

export const parseMetadata = async (xmlString: string): Promise<ParsedMetadata> => {
  try {
    const parser = new xml2js.Parser({
      explicitArray: false,
      tagNameProcessors: [xml2js.processors.stripPrefix],
    });

    const result = await parser.parseStringPromise(xmlString);
    const descriptor = result.EntityDescriptor;

    if (!descriptor) {
      throw new Error('Invalid SAML metadata: Missing EntityDescriptor');
    }

    const entityId = descriptor.$.entityID;
    const metadata: ParsedMetadata = {
      entityId,
      ssoUrl: undefined,
      sloUrl: undefined,
      acsUrls: [],
      certificates: [],
      type: 'SP',
    };

    // Parse SP metadata
    if (descriptor.SPSSODescriptor) {
      metadata.type = 'SP';
      const spDescriptor = descriptor.SPSSODescriptor;

      // ACS URLs
      if (spDescriptor.AssertionConsumerService) {
        const acsServices = Array.isArray(spDescriptor.AssertionConsumerService)
          ? spDescriptor.AssertionConsumerService
          : [spDescriptor.AssertionConsumerService];

        metadata.acsUrls = acsServices
          .map((acs: any) => acs.$.Location)
          .filter((url: string) => url);
      }

      // SLO URL
      if (spDescriptor.SingleLogoutService) {
        const sloService = Array.isArray(spDescriptor.SingleLogoutService)
          ? spDescriptor.SingleLogoutService[0]
          : spDescriptor.SingleLogoutService;
        metadata.sloUrl = sloService.$.Location;
      }

      // Certificates
      if (spDescriptor.KeyDescriptor) {
        const keyDescriptors = Array.isArray(spDescriptor.KeyDescriptor)
          ? spDescriptor.KeyDescriptor
          : [spDescriptor.KeyDescriptor];

        metadata.certificates = keyDescriptors
          .map((kd: any) => kd.KeyInfo?.X509Data?.X509Certificate)
          .filter((cert: string) => cert);
      }
    }

    // Parse IdP metadata
    if (descriptor.IDPSSODescriptor) {
      metadata.type = 'IDP';
      const idpDescriptor = descriptor.IDPSSODescriptor;

      // SSO URL
      if (idpDescriptor.SingleSignOnService) {
        const ssoService = Array.isArray(idpDescriptor.SingleSignOnService)
          ? idpDescriptor.SingleSignOnService[0]
          : idpDescriptor.SingleSignOnService;
        metadata.ssoUrl = ssoService.$.Location;
      }

      // SLO URL
      if (idpDescriptor.SingleLogoutService) {
        const sloService = Array.isArray(idpDescriptor.SingleLogoutService)
          ? idpDescriptor.SingleLogoutService[0]
          : idpDescriptor.SingleLogoutService;
        metadata.sloUrl = sloService.$.Location;
      }

      // Certificates
      if (idpDescriptor.KeyDescriptor) {
        const keyDescriptors = Array.isArray(idpDescriptor.KeyDescriptor)
          ? idpDescriptor.KeyDescriptor
          : [idpDescriptor.KeyDescriptor];

        metadata.certificates = keyDescriptors
          .map((kd: any) => kd.KeyInfo?.X509Data?.X509Certificate)
          .filter((cert: string) => cert);
      }
    }

    return metadata;
  } catch (error) {
    console.error('Error parsing metadata:', error);
    throw new Error('Failed to parse SAML metadata');
  }
};

export const generateSpMetadata = (config: {
  entityId: string;
  acsUrl: string;
  sloUrl?: string;
  certificate: string;
}): string => {
  const cert = formatCertificate(config.certificate)
    .replace('-----BEGIN CERTIFICATE-----', '')
    .replace('-----END CERTIFICATE-----', '')
    .replace(/\n/g, '');

  return `<?xml version="1.0"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     validUntil="2034-01-01T00:00:00Z"
                     entityID="${config.entityId}">
  <md:SPSSODescriptor AuthnRequestsSigned="true" WantAssertionsSigned="true"
                      protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:KeyDescriptor use="signing">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data>
          <ds:X509Certificate>${cert}</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>
    <md:KeyDescriptor use="encryption">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data>
          <ds:X509Certificate>${cert}</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>
    <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                           Location="${config.sloUrl || config.acsUrl.replace('/acs', '/slo')}" />
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                                Location="${config.acsUrl}"
                                index="1" isDefault="true" />
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;
};

export const generateIdpMetadata = (config: {
  entityId: string;
  ssoUrl: string;
  sloUrl?: string;
  certificate: string;
}): string => {
  const cert = formatCertificate(config.certificate)
    .replace('-----BEGIN CERTIFICATE-----', '')
    .replace('-----END CERTIFICATE-----', '')
    .replace(/\n/g, '');

  return `<?xml version="1.0"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     validUntil="2034-01-01T00:00:00Z"
                     entityID="${config.entityId}">
  <md:IDPSSODescriptor WantAuthnRequestsSigned="false"
                       protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:KeyDescriptor use="signing">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data>
          <ds:X509Certificate>${cert}</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>
    <md:KeyDescriptor use="encryption">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data>
          <ds:X509Certificate>${cert}</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>
    <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                           Location="${config.sloUrl || config.ssoUrl.replace('/sso', '/slo')}" />
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                           Location="${config.ssoUrl}" />
    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                           Location="${config.ssoUrl}" />
  </md:IDPSSODescriptor>
</md:EntityDescriptor>`;
};
