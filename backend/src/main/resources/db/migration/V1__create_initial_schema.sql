-- =============================================================
--  V1__create_initial_schema.sql
--  Stigma — Schema inicial
--  Cria todas as tabelas, enums, índices e constraints
-- =============================================================

-- -------------------------------------------------------------
--  EXTENSÕES
-- -------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- -------------------------------------------------------------
--  ENUMS
-- -------------------------------------------------------------
CREATE TYPE lead_status AS ENUM (
    'NOVO',
    'APROVADO',
    'REJEITADO',
    'AGUARDANDO_PAGAMENTO',
    'CONFIRMADO',
    'CONCLUIDO',
    'CANCELADO',
    'NO_SHOW',
    'EXPIRADO'
);

CREATE TYPE appointment_status AS ENUM (
    'AGUARDANDO_PAGAMENTO',
    'CONFIRMADO',
    'CONCLUIDO',
    'CANCELADO',
    'NO_SHOW',
    'EXPIRADO'
);

CREATE TYPE day_of_week_type AS ENUM (
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY'
);

-- -------------------------------------------------------------
--  TATTOOIST
--  O tatuador/estúdio que usa o sistema
-- -------------------------------------------------------------
CREATE TABLE tattooists (
                            id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                            name                VARCHAR(150) NOT NULL,
                            email               VARCHAR(255) NOT NULL UNIQUE,
                            password_hash       VARCHAR(255) NOT NULL,
                            whatsapp            VARCHAR(20),
                            slug                VARCHAR(100) NOT NULL UNIQUE,  -- ex: joao-tattoo
                            bio                 TEXT,
                            instagram           VARCHAR(100),
                            pix_key             VARCHAR(255),
                            deposit_percentage  NUMERIC(5,2) NOT NULL DEFAULT 30.00,
                            google_calendar_id  VARCHAR(255),
                            google_refresh_token TEXT,
                            active              BOOLEAN NOT NULL DEFAULT TRUE,
                            created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                            updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
--  AVAILABLE_SLOTS
--  Horários disponíveis configurados pelo tatuador
--  Pode ser recorrente (day_of_week) ou pontual (specific_date)
-- -------------------------------------------------------------
CREATE TABLE available_slots (
                                 id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                                 tattooist_id    UUID        NOT NULL REFERENCES tattooists(id) ON DELETE CASCADE,
                                 day_of_week     day_of_week_type,              -- NULL se for pontual
                                 specific_date   DATE,                     -- NULL se for recorrente
                                 start_time      TIME        NOT NULL,
                                 end_time        TIME        NOT NULL,
                                 is_blocked      BOOLEAN     NOT NULL DEFAULT FALSE,
                                 created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

                                 CONSTRAINT chk_slot_type CHECK (
                                     (day_of_week IS NOT NULL AND specific_date IS NULL) OR
                                     (day_of_week IS NULL AND specific_date IS NOT NULL)
                                     )
);

-- -------------------------------------------------------------
--  LEADS
--  Solicitações de orçamento vindas da landing page
-- -------------------------------------------------------------
CREATE TABLE leads (
                       id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                       tattooist_id        UUID        NOT NULL REFERENCES tattooists(id) ON DELETE CASCADE,
                       client_name         VARCHAR(150) NOT NULL,
                       client_whatsapp     VARCHAR(20)  NOT NULL,
                       client_email        VARCHAR(255),
                       tattoo_style        VARCHAR(100) NOT NULL,
                       body_part           VARCHAR(100) NOT NULL,
                       estimated_size_cm   NUMERIC(5,1) NOT NULL,
                       description         TEXT,
                       reference_image_url TEXT,
                       quoted_price        NUMERIC(10,2),
                       budget_notes        TEXT,
                       status              lead_status  NOT NULL DEFAULT 'NOVO',
                       created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                       updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
--  APPOINTMENTS
--  Agendamentos confirmados (gerados a partir de um Lead aprovado)
-- -------------------------------------------------------------
CREATE TABLE appointments (
                              id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
                              tattooist_id        UUID            NOT NULL REFERENCES tattooists(id) ON DELETE CASCADE,
                              lead_id             UUID            NOT NULL REFERENCES leads(id),
                              scheduled_at        TIMESTAMPTZ     NOT NULL,
                              duration_minutes    INTEGER         NOT NULL DEFAULT 120,
                              total_price         NUMERIC(10,2)   NOT NULL,
                              deposit_amount      NUMERIC(10,2)   NOT NULL,
                              status              appointment_status NOT NULL DEFAULT 'AGUARDANDO_PAGAMENTO',

    -- Token único enviado ao cliente para acessar o fluxo de agendamento
                              booking_token       VARCHAR(255)    UNIQUE,
                              booking_token_expires_at TIMESTAMPTZ,

    -- Integração Google Calendar
                              google_event_id     VARCHAR(255),

    -- Integração Mercado Pago
                              payment_id          VARCHAR(255),
                              payment_status      VARCHAR(50),
                              payment_method      VARCHAR(50),
                              paid_at             TIMESTAMPTZ,

                              confirmed_at        TIMESTAMPTZ,
                              created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
                              updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
--  HEALTH_FORMS
--  Ficha de anamnese preenchida pelo cliente antes da sessão
-- -------------------------------------------------------------
CREATE TABLE health_forms (
                              id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                              appointment_id          UUID        NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
                              full_name               VARCHAR(150) NOT NULL,
                              birth_date              DATE         NOT NULL,
                              is_pregnant             BOOLEAN      NOT NULL DEFAULT FALSE,
                              has_allergies           BOOLEAN      NOT NULL DEFAULT FALSE,
                              allergies_detail        TEXT,
                              has_blood_disorder      BOOLEAN      NOT NULL DEFAULT FALSE,
                              takes_anticoagulant     BOOLEAN      NOT NULL DEFAULT FALSE,
                              has_chronic_disease     BOOLEAN      NOT NULL DEFAULT FALSE,
                              chronic_disease_detail  TEXT,
                              has_skin_disease        BOOLEAN      NOT NULL DEFAULT FALSE,
                              had_recent_surgery      BOOLEAN      NOT NULL DEFAULT FALSE,
                              recent_surgery_detail   TEXT,
                              takes_medication        BOOLEAN      NOT NULL DEFAULT FALSE,
                              medication_detail       TEXT,
                              accepts_terms           BOOLEAN      NOT NULL DEFAULT FALSE,
                              submitted_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================================
--  ÍNDICES
--  Criados para os padrões de consulta mais comuns
-- =============================================================

-- Tatuador por slug (landing page pública)
CREATE INDEX idx_tattooists_slug ON tattooists(slug);

-- Leads por tatuador + status (dashboard — listagem com filtro)
CREATE INDEX idx_leads_tattooist_status ON leads(tattooist_id, status);

-- Leads por WhatsApp do cliente (deduplicação no momento da criação)
CREATE INDEX idx_leads_whatsapp_tattooist ON leads(client_whatsapp, tattooist_id);

-- Agendamentos por tatuador + data (agenda do dashboard)
CREATE INDEX idx_appointments_tattooist_date ON appointments(tattooist_id, scheduled_at);

-- Agendamentos por status (jobs de expiração automática)
CREATE INDEX idx_appointments_status ON appointments(status);

-- Booking token (consulta no fluxo do cliente)
CREATE INDEX idx_appointments_booking_token ON appointments(booking_token)
    WHERE booking_token IS NOT NULL;

-- Slots por tatuador (consulta de disponibilidade)
CREATE INDEX idx_slots_tattooist ON available_slots(tattooist_id);

-- =============================================================
--  TRIGGER: updated_at automático
-- =============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tattooists_updated_at
    BEFORE UPDATE ON tattooists
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();