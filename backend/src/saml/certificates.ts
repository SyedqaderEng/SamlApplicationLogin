import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface CertificateInfo {
  privateKey: string;
  certificate: string;
}

export const generateSelfSignedCertificate = (outputDir: string = './certs'): CertificateInfo => {
  try {
    // Create certs directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const privateKeyPath = path.join(outputDir, 'saml-private-key.pem');
    const certPath = path.join(outputDir, 'saml-cert.pem');

    // Check if certificates already exist
    if (fs.existsSync(privateKeyPath) && fs.existsSync(certPath)) {
      console.log('Using existing SAML certificates');
      return {
        privateKey: fs.readFileSync(privateKeyPath, 'utf8'),
        certificate: fs.readFileSync(certPath, 'utf8'),
      };
    }

    console.log('Generating new SAML certificates...');

    // Generate private key
    execSync(
      `openssl genrsa -out ${privateKeyPath} 2048`,
      { stdio: 'inherit' }
    );

    // Generate certificate (valid for 10 years)
    execSync(
      `openssl req -new -x509 -key ${privateKeyPath} -out ${certPath} -days 3650 ` +
      `-subj "/C=US/ST=State/L=City/O=SAML Test Platform/CN=localhost"`,
      { stdio: 'inherit' }
    );

    console.log('SAML certificates generated successfully');

    return {
      privateKey: fs.readFileSync(privateKeyPath, 'utf8'),
      certificate: fs.readFileSync(certPath, 'utf8'),
    };
  } catch (error) {
    console.error('Error generating certificates:', error);
    throw new Error('Failed to generate SAML certificates');
  }
};

export const getCertificateFingerprint = (certificate: string): string => {
  try {
    // Remove header and footer
    const cleanCert = certificate
      .replace('-----BEGIN CERTIFICATE-----', '')
      .replace('-----END CERTIFICATE-----', '')
      .replace(/\s/g, '');

    // Calculate SHA-256 fingerprint
    const crypto = require('crypto');
    const fingerprint = crypto
      .createHash('sha256')
      .update(Buffer.from(cleanCert, 'base64'))
      .digest('hex')
      .toUpperCase()
      .match(/.{2}/g)
      .join(':');

    return fingerprint;
  } catch (error) {
    console.error('Error calculating fingerprint:', error);
    return '';
  }
};

export const formatCertificate = (cert: string): string => {
  // Remove any existing headers/footers and whitespace
  let cleanCert = cert
    .replace('-----BEGIN CERTIFICATE-----', '')
    .replace('-----END CERTIFICATE-----', '')
    .replace(/\s/g, '');

  // Add headers and format with line breaks every 64 characters
  const formatted = cleanCert.match(/.{1,64}/g)?.join('\n') || '';
  return `-----BEGIN CERTIFICATE-----\n${formatted}\n-----END CERTIFICATE-----`;
};
