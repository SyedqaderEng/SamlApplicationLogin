-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMP(3),
    "saml_name_id" TEXT,
    "saml_entity_id" TEXT,
    "saml_attributes" JSONB,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saml_entities" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "raw_xml" TEXT NOT NULL,
    "parsed_json" JSONB NOT NULL,
    "sso_url" TEXT,
    "slo_url" TEXT,
    "acs_urls" TEXT[],
    "certificates" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saml_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saml_logs" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT,
    "user_id" TEXT,
    "event_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saml_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saml_config" (
    "id" TEXT NOT NULL,
    "app_role" TEXT NOT NULL,
    "default_entity_id" TEXT NOT NULL,
    "signing_key" TEXT,
    "signing_cert" TEXT,
    "encryption_key" TEXT,
    "encryption_cert" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saml_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "saml_entities_entity_id_key" ON "saml_entities"("entity_id");

-- CreateIndex
CREATE INDEX "saml_logs_user_id_idx" ON "saml_logs"("user_id");

-- CreateIndex
CREATE INDEX "saml_logs_created_at_idx" ON "saml_logs"("created_at");

-- AddForeignKey
ALTER TABLE "saml_logs" ADD CONSTRAINT "saml_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
