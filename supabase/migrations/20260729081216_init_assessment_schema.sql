-- Sprint DB-1 – Core Runtime
CREATE TABLE assessment_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_code text NOT NULL,      -- Changed from assessment_id uuid
    pack_id text NOT NULL,              -- Changed from uuid to text (e.g., 'disc_dual_profile')
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    status text NOT NULL CHECK (status IN ('started', 'completed', 'abandoned', 'expired'))
);

CREATE TABLE assessment_results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid REFERENCES assessment_sessions(id) ON DELETE CASCADE,
    dimension text NOT NULL,
    raw_score numeric NOT NULL,
    normalized_score numeric(5,2) NOT NULL -- Precision limited for scores 0.00 - 100.00
);

CREATE TABLE assessment_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid REFERENCES assessment_sessions(id) ON DELETE CASCADE,
    snapshot_json jsonb NOT NULL,
    engine_version text,                -- Added for tracking engine version
    generated_at timestamptz NOT NULL DEFAULT now()
);

-- Sprint DB-2 – Business Layer
CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email varchar(255) NOT NULL UNIQUE,
    name text,
    source text,
    is_lead boolean DEFAULT false,      -- Consolidated email_leads concept
    lead_captured_at timestamptz        -- Optional timestamp when user identified as lead
);

-- email_leads table removed; its functionality covered by is_lead in users

CREATE TABLE feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    content text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE analytics_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    session_id uuid REFERENCES assessment_sessions(id) ON DELETE SET NULL, -- Added for session drop‑off/completion tracking
    event_name text NOT NULL,
    event_payload jsonb,
    occurred_at timestamptz NOT NULL DEFAULT now()
);

-- Sprint DB-3 – Experiment Layer
CREATE TABLE experiments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_name text NOT NULL,      -- Added
    variant text NOT NULL,
    traffic_source text,
    conversion boolean,
    status text DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
    started_at timestamptz,
    ended_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE assessment_feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid REFERENCES assessment_sessions(id) ON DELETE CASCADE,
    accuracy_rating integer CHECK (accuracy_rating BETWEEN 1 AND 5),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- End of migration