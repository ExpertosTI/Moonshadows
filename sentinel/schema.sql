-- ============================================================
-- MOONSHADOWS · SENTINEL TELEMETRY · POSTGRES SCHEMA v1.0
-- Target: Insforge (Postgres-compatible BaaS)
--
-- Design principles:
--   · Privacy-first  : no raw IP, no PII, IPs hashed server-side.
--   · Append-only    : events are immutable, indexed for time queries.
--   · Dashboard-ready: pre-computed views for fast Sentinel console.
--   · Row-Level Sec  : anonymous can INSERT, only admin can SELECT.
--
-- Run order:
--   1. CREATE EXTENSION
--   2. CREATE TABLES
--   3. CREATE INDEXES
--   4. CREATE VIEWS
--   5. ENABLE RLS + POLICIES
-- ============================================================

-- ── 1. Extensions ──────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- trigram search on text


-- ── 2. Tables ──────────────────────────────────────────────

-- 2.1 Sessions: one row per visit, updated as session progresses.
CREATE TABLE IF NOT EXISTS sentinel_sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          TEXT NOT NULL UNIQUE,
    visitor_id          TEXT NOT NULL,

    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at            TIMESTAMPTZ,
    duration_seconds    INTEGER GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (COALESCE(ended_at, last_seen_at) - started_at))::INTEGER
    ) STORED,

    -- Engagement
    pages_viewed        INTEGER NOT NULL DEFAULT 1,
    scenes_viewed       JSONB NOT NULL DEFAULT '[]'::JSONB,
    max_scene_reached   INTEGER NOT NULL DEFAULT 0,
    max_scroll_depth    INTEGER NOT NULL DEFAULT 0,
    interactions_count  INTEGER NOT NULL DEFAULT 0,
    cta_clicks_count    INTEGER NOT NULL DEFAULT 0,
    bounced             BOOLEAN NOT NULL DEFAULT TRUE,

    -- Acquisition
    entry_page          TEXT NOT NULL DEFAULT '/',
    referrer            TEXT,
    referrer_domain     TEXT,
    utm_source          TEXT,
    utm_medium          TEXT,
    utm_campaign        TEXT,
    utm_term            TEXT,
    utm_content         TEXT,

    -- Device / client
    device_type         TEXT,           -- 'mobile' | 'tablet' | 'desktop'
    browser             TEXT,
    browser_version     TEXT,
    os                  TEXT,
    os_version          TEXT,
    language            TEXT,
    timezone            TEXT,
    viewport_width      INTEGER,
    viewport_height     INTEGER,
    screen_width        INTEGER,
    screen_height       INTEGER,
    pixel_ratio         NUMERIC(3,1),
    touch_capable       BOOLEAN,
    color_scheme        TEXT,           -- 'dark' | 'light'
    reduced_motion      BOOLEAN,

    -- Geo (Insforge populates from IP at ingest)
    country             TEXT,
    region              TEXT,
    city                TEXT,
    ip_hash             TEXT,           -- sha256 of IP + salt, set server-side

    user_agent          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 Events: append-only stream of every interaction.
CREATE TABLE IF NOT EXISTS sentinel_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          TEXT NOT NULL,
    visitor_id          TEXT NOT NULL,

    event_type          TEXT NOT NULL,  -- page_view, click, scroll, scene_change,
                                        -- light_toggle, card_open, card_close,
                                        -- cta_click, link_click, hover, focus,
                                        -- form_focus, copy, share, idle, resume,
                                        -- visibility_hidden, visibility_visible,
                                        -- session_start, session_end
    event_name          TEXT,           -- granular label

    -- Target
    target_id           TEXT,           -- 'cta-whatsapp', 'node-1', etc.
    target_label        TEXT,           -- visible text/aria-label
    target_href         TEXT,           -- destination URL if link
    target_selector     TEXT,           -- CSS selector path

    -- Context
    scene_id            TEXT,
    scene_index         INTEGER,
    scroll_depth        INTEGER,
    viewport_x          INTEGER,
    viewport_y          INTEGER,
    page_x              INTEGER,
    page_y              INTEGER,
    value_num           NUMERIC,
    meta                JSONB DEFAULT '{}'::JSONB,

    client_ts           BIGINT,         -- ms epoch from client
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.3 Performance: one row per page-load.
CREATE TABLE IF NOT EXISTS sentinel_performance (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          TEXT NOT NULL,
    visitor_id          TEXT NOT NULL,
    page_url            TEXT NOT NULL,

    -- Core Web Vitals
    fcp                 NUMERIC(10,2),
    lcp                 NUMERIC(10,2),
    cls                 NUMERIC(10,4),
    fid                 NUMERIC(10,2),
    inp                 NUMERIC(10,2),
    ttfb                NUMERIC(10,2),

    -- Navigation timing
    dom_interactive     NUMERIC(10,2),
    dom_content_loaded  NUMERIC(10,2),
    load_event          NUMERIC(10,2),

    -- Network
    connection_type     TEXT,
    effective_type      TEXT,
    downlink            NUMERIC(6,2),
    rtt                 INTEGER,
    save_data           BOOLEAN,

    -- Memory (when available)
    js_heap_used_mb     NUMERIC(8,2),
    js_heap_total_mb    NUMERIC(8,2),

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.4 Errors: JS errors captured by sentinel client.
CREATE TABLE IF NOT EXISTS sentinel_errors (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          TEXT NOT NULL,
    visitor_id          TEXT NOT NULL,

    error_type          TEXT NOT NULL,  -- 'js_error' | 'promise_rejection' | 'resource_error'
    message             TEXT NOT NULL,
    source              TEXT,
    lineno              INTEGER,
    colno               INTEGER,
    stack               TEXT,
    page_url            TEXT,
    user_agent          TEXT,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.5 Admin audit: every PIN attempt and console open.
CREATE TABLE IF NOT EXISTS sentinel_admin_audit (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event               TEXT NOT NULL,  -- 'pin_attempt' | 'pin_success' | 'console_open' | 'console_close'
    success             BOOLEAN NOT NULL,
    session_id          TEXT,
    visitor_id          TEXT,
    ip_hash             TEXT,
    user_agent          TEXT,
    meta                JSONB DEFAULT '{}'::JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ── 3. Indexes ─────────────────────────────────────────────

-- Sessions
CREATE INDEX IF NOT EXISTS idx_sessions_visitor      ON sentinel_sessions (visitor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at   ON sentinel_sessions (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_country      ON sentinel_sessions (country);
CREATE INDEX IF NOT EXISTS idx_sessions_device       ON sentinel_sessions (device_type);
CREATE INDEX IF NOT EXISTS idx_sessions_referrer_dom ON sentinel_sessions (referrer_domain);
CREATE INDEX IF NOT EXISTS idx_sessions_utm_source   ON sentinel_sessions (utm_source);

-- Events
CREATE INDEX IF NOT EXISTS idx_events_session        ON sentinel_events (session_id);
CREATE INDEX IF NOT EXISTS idx_events_visitor        ON sentinel_events (visitor_id);
CREATE INDEX IF NOT EXISTS idx_events_type           ON sentinel_events (event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_at     ON sentinel_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_type_created   ON sentinel_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_target         ON sentinel_events (target_id) WHERE target_id IS NOT NULL;

-- Performance
CREATE INDEX IF NOT EXISTS idx_perf_session          ON sentinel_performance (session_id);
CREATE INDEX IF NOT EXISTS idx_perf_created_at       ON sentinel_performance (created_at DESC);

-- Errors
CREATE INDEX IF NOT EXISTS idx_errors_session        ON sentinel_errors (session_id);
CREATE INDEX IF NOT EXISTS idx_errors_created_at     ON sentinel_errors (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_errors_type           ON sentinel_errors (error_type);

-- Audit
CREATE INDEX IF NOT EXISTS idx_audit_created_at      ON sentinel_admin_audit (created_at DESC);


-- ── 4. Dashboard Views ─────────────────────────────────────

-- 4.1 Daily roll-up: sessions, visitors, bounce rate, avg duration.
CREATE OR REPLACE VIEW sentinel_v_daily AS
SELECT
    DATE_TRUNC('day', started_at)::DATE  AS day,
    COUNT(*)                              AS sessions,
    COUNT(DISTINCT visitor_id)            AS unique_visitors,
    SUM(CASE WHEN bounced THEN 1 ELSE 0 END)::FLOAT
        / NULLIF(COUNT(*), 0)             AS bounce_rate,
    AVG(duration_seconds)::INTEGER        AS avg_duration_seconds,
    AVG(max_scroll_depth)::INTEGER        AS avg_scroll_depth,
    AVG(max_scene_reached)::NUMERIC(3,1)  AS avg_scene_reached,
    SUM(cta_clicks_count)                 AS total_cta_clicks,
    SUM(interactions_count)               AS total_interactions
FROM sentinel_sessions
GROUP BY 1
ORDER BY 1 DESC;

-- 4.2 Scene engagement: which scenes hold attention.
CREATE OR REPLACE VIEW sentinel_v_scene_engagement AS
SELECT
    scene_id,
    COUNT(*) FILTER (WHERE event_type = 'scene_change')     AS scene_visits,
    COUNT(*) FILTER (WHERE event_type = 'card_open')        AS card_opens,
    COUNT(*) FILTER (WHERE event_type = 'cta_click')        AS cta_clicks,
    COUNT(DISTINCT session_id)                              AS unique_sessions,
    AVG(scroll_depth) FILTER (WHERE scroll_depth IS NOT NULL)::INTEGER AS avg_scroll_depth
FROM sentinel_events
WHERE scene_id IS NOT NULL
GROUP BY scene_id
ORDER BY scene_visits DESC;

-- 4.3 Top referrers (last 30 days).
CREATE OR REPLACE VIEW sentinel_v_top_referrers AS
SELECT
    COALESCE(NULLIF(referrer_domain, ''), '(direct)') AS source,
    COUNT(*)                                          AS sessions,
    COUNT(DISTINCT visitor_id)                        AS unique_visitors,
    AVG(duration_seconds)::INTEGER                    AS avg_duration,
    SUM(CASE WHEN NOT bounced THEN 1 ELSE 0 END)::FLOAT
        / NULLIF(COUNT(*), 0)                          AS engagement_rate
FROM sentinel_sessions
WHERE started_at >= NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY sessions DESC;

-- 4.4 Geo breakdown.
CREATE OR REPLACE VIEW sentinel_v_geo AS
SELECT
    COALESCE(country, 'Unknown')                  AS country,
    COUNT(*)                                       AS sessions,
    COUNT(DISTINCT visitor_id)                     AS unique_visitors,
    AVG(duration_seconds)::INTEGER                 AS avg_duration
FROM sentinel_sessions
WHERE started_at >= NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY sessions DESC;

-- 4.5 Device breakdown.
CREATE OR REPLACE VIEW sentinel_v_device AS
SELECT
    COALESCE(device_type, 'unknown') AS device_type,
    COALESCE(browser, 'unknown')      AS browser,
    COALESCE(os, 'unknown')           AS os,
    COUNT(*)                           AS sessions,
    AVG(duration_seconds)::INTEGER     AS avg_duration
FROM sentinel_sessions
WHERE started_at >= NOW() - INTERVAL '30 days'
GROUP BY 1, 2, 3
ORDER BY sessions DESC;

-- 4.6 Conversion funnel: ignite → services → method → contact → CTA.
CREATE OR REPLACE VIEW sentinel_v_funnel AS
WITH stages AS (
    SELECT
        session_id,
        MAX(CASE WHEN scene_index >= 0 THEN 1 ELSE 0 END) AS stage_0_landed,
        MAX(CASE WHEN scene_index >= 1 THEN 1 ELSE 0 END) AS stage_1_services,
        MAX(CASE WHEN scene_index >= 2 THEN 1 ELSE 0 END) AS stage_2_method,
        MAX(CASE WHEN scene_index >= 3 THEN 1 ELSE 0 END) AS stage_3_contact,
        MAX(CASE WHEN event_type = 'cta_click' THEN 1 ELSE 0 END) AS stage_4_cta
    FROM sentinel_events
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY session_id
)
SELECT
    SUM(stage_0_landed)    AS landed,
    SUM(stage_1_services)  AS reached_services,
    SUM(stage_2_method)    AS reached_method,
    SUM(stage_3_contact)   AS reached_contact,
    SUM(stage_4_cta)       AS clicked_cta
FROM stages;

-- 4.7 Real-time live sessions (last 5 minutes).
CREATE OR REPLACE VIEW sentinel_v_live AS
SELECT
    session_id,
    visitor_id,
    country,
    city,
    device_type,
    browser,
    referrer_domain,
    max_scene_reached,
    interactions_count,
    last_seen_at,
    EXTRACT(EPOCH FROM (NOW() - last_seen_at))::INTEGER AS seconds_since_seen
FROM sentinel_sessions
WHERE last_seen_at >= NOW() - INTERVAL '5 minutes'
ORDER BY last_seen_at DESC;

-- 4.8 Performance percentiles (last 7 days).
CREATE OR REPLACE VIEW sentinel_v_perf AS
SELECT
    PERCENTILE_CONT(0.5)  WITHIN GROUP (ORDER BY lcp)  AS lcp_p50,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY lcp)  AS lcp_p75,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY lcp)  AS lcp_p95,
    PERCENTILE_CONT(0.5)  WITHIN GROUP (ORDER BY fcp)  AS fcp_p50,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY fcp)  AS fcp_p75,
    PERCENTILE_CONT(0.5)  WITHIN GROUP (ORDER BY cls)  AS cls_p50,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY cls)  AS cls_p75,
    PERCENTILE_CONT(0.5)  WITHIN GROUP (ORDER BY ttfb) AS ttfb_p50,
    COUNT(*)                                            AS samples
FROM sentinel_performance
WHERE created_at >= NOW() - INTERVAL '7 days';


-- ── 5. Triggers ────────────────────────────────────────────

-- Auto-update last_seen_at, bounced, counters on session activity.
CREATE OR REPLACE FUNCTION sentinel_touch_session()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE sentinel_sessions
    SET
        last_seen_at        = NOW(),
        interactions_count  = interactions_count + 1,
        max_scroll_depth    = GREATEST(max_scroll_depth, COALESCE(NEW.scroll_depth, 0)),
        max_scene_reached   = GREATEST(max_scene_reached, COALESCE(NEW.scene_index, 0)),
        cta_clicks_count    = cta_clicks_count + CASE WHEN NEW.event_type = 'cta_click' THEN 1 ELSE 0 END,
        bounced             = CASE
            WHEN interactions_count + 1 > 1 THEN FALSE
            ELSE bounced
        END
    WHERE session_id = NEW.session_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_event_touch_session ON sentinel_events;
CREATE TRIGGER trg_event_touch_session
    AFTER INSERT ON sentinel_events
    FOR EACH ROW
    EXECUTE FUNCTION sentinel_touch_session();


-- ── 6. Row-Level Security ──────────────────────────────────
-- Anon role: INSERT only, on ingest tables. Cannot read.
-- Admin role: full SELECT on all tables/views.

ALTER TABLE sentinel_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentinel_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentinel_performance   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentinel_errors        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentinel_admin_audit   ENABLE ROW LEVEL SECURITY;

-- Public ingest (anonymous role can write)
DROP POLICY IF EXISTS p_anon_insert_sessions    ON sentinel_sessions;
CREATE POLICY p_anon_insert_sessions    ON sentinel_sessions    FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS p_anon_update_sessions    ON sentinel_sessions;
CREATE POLICY p_anon_update_sessions    ON sentinel_sessions    FOR UPDATE USING (true)  WITH CHECK (true);

DROP POLICY IF EXISTS p_anon_insert_events      ON sentinel_events;
CREATE POLICY p_anon_insert_events      ON sentinel_events      FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS p_anon_insert_perf        ON sentinel_performance;
CREATE POLICY p_anon_insert_perf        ON sentinel_performance FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS p_anon_insert_errors      ON sentinel_errors;
CREATE POLICY p_anon_insert_errors      ON sentinel_errors      FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS p_anon_insert_audit       ON sentinel_admin_audit;
CREATE POLICY p_anon_insert_audit       ON sentinel_admin_audit FOR INSERT WITH CHECK (true);

-- Admin read-all (requires JWT claim role = 'admin' set in Insforge dashboard).
-- Adjust the auth.role() function to match your Insforge auth model.
DROP POLICY IF EXISTS p_admin_select_sessions   ON sentinel_sessions;
CREATE POLICY p_admin_select_sessions   ON sentinel_sessions    FOR SELECT USING (auth.role() = 'admin');
DROP POLICY IF EXISTS p_admin_select_events     ON sentinel_events;
CREATE POLICY p_admin_select_events     ON sentinel_events      FOR SELECT USING (auth.role() = 'admin');
DROP POLICY IF EXISTS p_admin_select_perf       ON sentinel_performance;
CREATE POLICY p_admin_select_perf       ON sentinel_performance FOR SELECT USING (auth.role() = 'admin');
DROP POLICY IF EXISTS p_admin_select_errors     ON sentinel_errors;
CREATE POLICY p_admin_select_errors     ON sentinel_errors      FOR SELECT USING (auth.role() = 'admin');
DROP POLICY IF EXISTS p_admin_select_audit      ON sentinel_admin_audit;
CREATE POLICY p_admin_select_audit      ON sentinel_admin_audit FOR SELECT USING (auth.role() = 'admin');


-- ── 7. Retention helpers (optional, run as cron) ───────────
-- Purge events older than 180 days to keep table light.
CREATE OR REPLACE FUNCTION sentinel_purge_old()
RETURNS VOID AS $$
BEGIN
    DELETE FROM sentinel_events       WHERE created_at < NOW() - INTERVAL '180 days';
    DELETE FROM sentinel_performance  WHERE created_at < NOW() - INTERVAL '180 days';
    DELETE FROM sentinel_errors       WHERE created_at < NOW() - INTERVAL '180 days';
    -- Sessions kept longer for funnel analysis.
    DELETE FROM sentinel_sessions     WHERE started_at < NOW() - INTERVAL '365 days';
END;
$$ LANGUAGE plpgsql;


-- ── 8. Privileges and Grants ────────────────────────────────
-- Grant usage on schema public to both anon and authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant ingest permissions (INSERT/UPDATE) to anon role
GRANT INSERT, UPDATE ON TABLE sentinel_sessions TO anon;
GRANT INSERT ON TABLE sentinel_events TO anon;
GRANT INSERT ON TABLE sentinel_performance TO anon;
GRANT INSERT ON TABLE sentinel_errors TO anon;
GRANT INSERT ON TABLE sentinel_admin_audit TO anon;

-- Grant select permissions on tables and views to both roles (filtered by RLS)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;


-- ============================================================
-- END OF SCHEMA · v1.0
-- ============================================================
