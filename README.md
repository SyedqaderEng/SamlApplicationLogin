# SAML Test Platform

A complete full-stack web application that acts as both a **SAML Service Provider (SP)** and **SAML Identity Provider (IdP)** for testing and development purposes.

## Features

- **Dual SAML Role Support**: Acts as both SP and IdP
- **Local Authentication**: Username/email + password signup and login
- **SAML Authentication**: Support for both SP-initiated and IdP-initiated login flows
- **Metadata Management**: Import and export SAML metadata (XML)
- **User Dashboard**: View user profile, SAML information, and login history
- **SAML Test Console**: Interactive testing interface for SAML flows
- **Activity Logs**: Comprehensive logging of all SAML events
- **Modern Tech Stack**: React, TypeScript, Node.js, PostgreSQL
- **Fully Dockerized**: Ready to run with Docker Compose

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **TailwindCSS** for styling
- **React Router** for navigation
- **React Hook Form** for form management
- **Axios** for API calls
- **Vite** for build tooling

### Backend
- **Node.js** with TypeScript
- **Express** web framework
- **PostgreSQL** database
- **Prisma** ORM
- **Samlify** for SAML protocol handling
- **bcrypt** for password hashing
- **JWT** for session management

### DevOps
- **Docker** and **Docker Compose**
- **Nginx** for frontend serving

## Project Structure

```
SamlApplicationLogin/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── auth.ts          # Authentication endpoints
│   │   │   ├── metadata.ts      # Metadata import/export
│   │   │   └── config.ts        # SAML config and logs
│   │   ├── config/
│   │   │   ├── database.ts      # Prisma client
│   │   │   ├── jwt.ts           # JWT utilities
│   │   │   └── saml.ts          # SAML configuration
│   │   ├── saml/
│   │   │   ├── samlSp.ts        # SP implementation
│   │   │   ├── samlIdp.ts       # IdP implementation
│   │   │   ├── metadata.ts      # Metadata parsing/generation
│   │   │   ├── acs.ts           # Assertion Consumer Service
│   │   │   └── certificates.ts  # Certificate management
│   │   ├── middleware/
│   │   │   └── authMiddleware.ts
│   │   ├── db/
│   │   │   └── schema.prisma    # Database schema
│   │   └── server.ts            # Express server
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Signup.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ImportMetadata.tsx
│   │   │   ├── ExportMetadata.tsx
│   │   │   ├── SamlTestConsole.tsx
│   │   │   ├── SamlCallback.tsx
│   │   │   ├── IdpLogin.tsx
│   │   │   └── Home.tsx
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── SamlStatusCard.tsx
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   └── auth.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .env
├── sample-metadata/
│   ├── sample-sp-metadata.xml
│   └── sample-idp-metadata.xml
├── docker-compose.yml
└── README.md
```

## Quick Start with Docker

### Prerequisites
- Docker and Docker Compose installed
- Ports 3001, 5173, and 5432 available

### Run the Application

```bash
# Clone the repository
git clone <repository-url>
cd SamlApplicationLogin

# Start all services
docker-compose up -d

# Wait for services to be ready (about 30 seconds)
docker-compose logs -f

# Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:3001
```

### Stop the Application

```bash
docker-compose down

# To remove volumes (database data)
docker-compose down -v
```

## Development Setup (Without Docker)

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- OpenSSL (for certificate generation)

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file (already exists)
# Update DATABASE_URL if needed

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start development server
npm run dev
```

Backend will run on http://localhost:3001

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file (already exists)
# No changes needed for local development

# Start development server
npm run dev
```

Frontend will run on http://localhost:5173

## Database Schema

### Users Table
- `id` (UUID)
- `email` (unique)
- `password_hash`
- `display_name`
- `saml_name_id`
- `saml_entity_id`
- `saml_attributes` (JSON)
- `created_at`
- `last_login_at`

### SAML Entities Table
- `id` (UUID)
- `type` ('SP' or 'IDP')
- `entity_id` (unique)
- `raw_xml` (metadata XML)
- `parsed_json` (parsed metadata)
- `sso_url`
- `slo_url`
- `acs_urls` (array)
- `certificates` (array)
- `active` (boolean)

### SAML Logs Table
- `id` (UUID)
- `entity_id`
- `user_id`
- `event_type` ('sp_login', 'idp_login', 'acs', 'sso', 'logout')
- `status` ('success', 'failure')
- `details` (JSONB)
- `created_at`

### SAML Config Table
- `id` (UUID)
- `app_role` ('SP', 'IDP', 'BOTH')
- `default_entity_id`
- `signing_key`
- `signing_cert`
- `encryption_key`
- `encryption_cert`

## SAML Endpoints

### Service Provider (SP) Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /saml/metadata` | SP metadata XML |
| `GET /saml/login?idpEntityId=<entityId>` | Initiate SP login |
| `POST /saml/acs` | Assertion Consumer Service |
| `POST /saml/slo` | Single Logout |

### Identity Provider (IdP) Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /saml/idp/metadata` | IdP metadata XML |
| `GET /saml/idp/sso` | Single Sign-On (GET) |
| `POST /saml/idp/sso` | Single Sign-On (POST) |
| `POST /saml/idp/login` | IdP authentication |
| `POST /saml/idp/slo` | Single Logout |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/signup` | POST | Create account |
| `/api/auth/login` | POST | Login |
| `/api/auth/me` | GET | Get current user |
| `/api/auth/me/saml-logs` | GET | Get user's SAML logs |
| `/api/metadata/import` | POST | Import metadata |
| `/api/metadata/entities` | GET | List all entities |
| `/api/metadata/entities/:id` | GET | Get entity details |
| `/api/metadata/entities/:id` | DELETE | Delete entity |
| `/api/metadata/export/sp` | GET | Export SP metadata |
| `/api/metadata/export/idp` | GET | Export IdP metadata |
| `/api/config` | GET | Get SAML config |
| `/api/config` | PUT | Update SAML config |
| `/api/config/logs` | GET | Get SAML logs |
| `/api/config/logs` | DELETE | Clear logs |

## Usage Guide

### 1. Create an Account

1. Navigate to http://localhost:5173
2. Click "Sign Up"
3. Enter your email, password, and display name
4. Click "Sign up"

### 2. Import External SAML Metadata

#### Import IdP Metadata (to act as SP)

1. Go to "Import Metadata"
2. Select "Identity Provider (IdP)" as type
3. Paste the IdP metadata XML or upload XML file
4. Click "Import Metadata"

#### Import SP Metadata (to act as IdP)

1. Go to "Import Metadata"
2. Select "Service Provider (SP)" as type
3. Paste the SP metadata XML or upload XML file
4. Click "Import Metadata"

### 3. Export Your Metadata

1. Go to "Export Metadata"
2. Click "Load SP Metadata" or "Load IdP Metadata"
3. Use "Download XML" or "Copy to Clipboard"
4. Share with external SAML partners

### 4. Test SAML Flows

#### Test SP-Initiated Login

1. Go to "Test Console"
2. Under "Test SP-Initiated Login", select an imported IdP
3. Click "Start SP-Initiated Login"
4. Authenticate with the external IdP
5. View results in "SAML Activity Logs"

#### Test IdP-Initiated Login

1. Go to "Test Console"
2. Under "Test IdP-Initiated Login", select an imported SP
3. Click "Start IdP-Initiated Login"
4. Authenticate with your credentials
5. SAML response will be sent to the SP

### 5. View Dashboard

1. Go to "Dashboard"
2. View your user profile information
3. View SAML authentication details
4. See recent SAML login attempts

## Testing with Sample Metadata

Sample metadata files are provided in `sample-metadata/`:

1. Use `sample-idp-metadata.xml` to test as a Service Provider
2. Use `sample-sp-metadata.xml` to test as an Identity Provider

**Note**: Sample metadata uses placeholder certificates. For production, use real certificates.

## Self-Testing (SP and IdP Together)

You can test the application with itself:

1. Export SP metadata: http://localhost:3001/api/metadata/export/sp
2. Import it as an external SP
3. Export IdP metadata: http://localhost:3001/api/metadata/export/idp
4. Import it as an external IdP
5. Now test SP-initiated and IdP-initiated flows using the application's own endpoints

## SAML Certificates

The application automatically generates self-signed certificates on first run:
- `certs/saml-private-key.pem` - Private key
- `certs/saml-cert.pem` - Public certificate

**For production**: Replace with proper certificates from a Certificate Authority.

## Environment Variables

### Backend (.env)

```bash
DATABASE_URL="postgresql://user:pass@host:port/db"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV="development"
SAML_ISSUER="http://localhost:3001"
SAML_CALLBACK_URL="http://localhost:3001/saml/acs"
SAML_IDP_SSO_URL="http://localhost:3001/saml/idp/sso"
FRONTEND_URL="http://localhost:5173"
```

### Frontend (.env)

```bash
VITE_API_URL=http://localhost:3001
```

## Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
lsof -i :3001  # Backend
lsof -i :5173  # Frontend
lsof -i :5432  # PostgreSQL

# Kill the process or change ports in .env files
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker-compose ps

# View logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up -d
```

### SAML Authentication Fails

1. Check SAML logs in Test Console
2. Verify metadata was imported correctly
3. Ensure certificates are valid
4. Check entity IDs match exactly
5. Review backend logs: `docker-compose logs backend`

### Frontend Build Issues

```bash
cd frontend
rm -rf node_modules dist
npm install
npm run build
```

## Security Considerations

### For Production

1. **Change JWT Secret**: Use a strong, random secret
2. **Use HTTPS**: All SAML communications should use HTTPS
3. **Real Certificates**: Replace self-signed certs with CA-signed certificates
4. **Database Security**: Use strong passwords, restrict access
5. **CORS Configuration**: Restrict allowed origins
6. **Rate Limiting**: Add rate limiting to API endpoints
7. **Input Validation**: Already implemented, but review for your use case
8. **SQL Injection**: Using Prisma ORM (protected by default)
9. **XSS Protection**: React escapes by default, TailwindCSS for styling

## API Documentation

All API endpoints return JSON (except metadata endpoints which return XML).

### Authentication Header

```
Authorization: Bearer <jwt-token>
```

### Example API Calls

#### Sign Up
```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","displayName":"Test User"}'
```

#### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

#### Import Metadata
```bash
curl -X POST http://localhost:3001/api/metadata/import \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"type":"IDP","xml":"<EntityDescriptor>...</EntityDescriptor>"}'
```

## Development

### Running Tests

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

### Database Migrations

```bash
cd backend

# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Open Prisma Studio (database GUI)
npx prisma studio
```

### Building for Production

```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build

# Or use Docker
docker-compose up --build
```

## License

MIT

## Support

For issues, questions, or contributions, please open an issue in the repository.

## Contributors

Built with ❤️ by your development team.
