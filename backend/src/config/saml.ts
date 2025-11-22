export const SAML_CONFIG = {
  issuer: process.env.SAML_ISSUER || 'http://localhost:3001',
  callbackUrl: process.env.SAML_CALLBACK_URL || 'http://localhost:3001/saml/acs',
  idpSsoUrl: process.env.SAML_IDP_SSO_URL || 'http://localhost:3001/saml/idp/sso',
  entryPoint: process.env.SAML_ENTRY_POINT || 'http://localhost:3001/saml/login',

  // Certificate paths (will be generated on first run)
  privateKeyPath: process.env.SAML_PRIVATE_KEY_PATH || './certs/saml-private-key.pem',
  certPath: process.env.SAML_CERT_PATH || './certs/saml-cert.pem',
};

export const SAML_DEFAULTS = {
  signatureAlgorithm: 'sha256',
  digestAlgorithm: 'sha256',
  wantAssertionsSigned: true,
  wantAuthnResponseSigned: true,
  allowCreate: true,
  requestedAuthnContext: ['urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport'],
  identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
};
