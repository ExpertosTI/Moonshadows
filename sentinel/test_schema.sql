-- ============================================================
-- MOONSHADOWS · SENTINEL TELEMETRY · SCHEMA TEST SUITE
-- Target: Postgres / Insforge (Postgres-compatible BaaS)
--
-- Features:
--   1. Transaction-wrapped (BEGIN / ROLLBACK) -> zero pollution.
--   2. Verifies table insertion constraints.
--   3. Verifies trigger reactivity (sentinel_touch_session).
--   4. Audits view mapping.
-- ============================================================

BEGIN;

-- 1. Test tables existence
DO $$
BEGIN
    ASSERT (SELECT count(*) FROM information_schema.tables WHERE table_name = 'sentinel_sessions') = 1, 'Table sentinel_sessions is missing';
    ASSERT (SELECT count(*) FROM information_schema.tables WHERE table_name = 'sentinel_events') = 1, 'Table sentinel_events is missing';
    ASSERT (SELECT count(*) FROM information_schema.tables WHERE table_name = 'sentinel_performance') = 1, 'Table sentinel_performance is missing';
    ASSERT (SELECT count(*) FROM information_schema.tables WHERE table_name = 'sentinel_errors') = 1, 'Table sentinel_errors is missing';
END $$;

-- 2. Test session insertion
INSERT INTO sentinel_sessions (
    session_id, visitor_id, entry_page, device_type, browser, os, bounced
) VALUES (
    'test-session-xyz-123', 'test-visitor-abc-987', '/', 'desktop', 'Chrome', 'macOS', true
);

-- 3. Verify session was successfully inserted
DO $$
DECLARE
    v_bounced boolean;
BEGIN
    SELECT bounced INTO v_bounced FROM sentinel_sessions WHERE session_id = 'test-session-xyz-123';
    ASSERT v_bounced = true, 'Session was not inserted or is not marked as bounced';
END $$;

-- 4. Test Event insertion & Trigger reactivity (Event 1)
INSERT INTO sentinel_events (
    session_id, visitor_id, event_type, event_name, target_id, target_label
) VALUES (
    'test-session-xyz-123', 'test-visitor-abc-987', 'click', 'click_services', 'cta-servicios', 'Ver Servicios'
);

-- 5. Verify that trigger updated the session state
DO $$
DECLARE
    v_interactions integer;
    v_bounced boolean;
BEGIN
    SELECT interactions_count, bounced INTO v_interactions, v_bounced 
    FROM sentinel_sessions WHERE session_id = 'test-session-xyz-123';
    
    ASSERT v_interactions = 1, 'Trigger failed: interactions_count is ' || v_interactions || ' (expected 1)';
END $$;

-- 6. Add second event to test bounce state transition
INSERT INTO sentinel_events (
    session_id, visitor_id, event_type, event_name, target_id, target_label
) VALUES (
    'test-session-xyz-123', 'test-visitor-abc-987', 'click', 'click_whatsapp', 'cta-whatsapp', 'Consultar WhatsApp'
);

-- 7. Verify bounce state transitioned to false
DO $$
DECLARE
    v_interactions integer;
    v_bounced boolean;
BEGIN
    SELECT interactions_count, bounced INTO v_interactions, v_bounced 
    FROM sentinel_sessions WHERE session_id = 'test-session-xyz-123';
    
    ASSERT v_interactions = 2, 'Trigger failed: interactions_count is ' || v_interactions || ' (expected 2)';
    ASSERT v_bounced = false, 'Trigger failed: bounce state is still true (expected false)';
END $$;

-- 8. Test Performance insertion
INSERT INTO sentinel_performance (
    session_id, visitor_id, page_url, fcp, lcp, cls, fid, ttfb
) VALUES (
    'test-session-xyz-123', 'test-visitor-abc-987', '/', 850.50, 1200.00, 0.015, 12.00, 120.00
);

-- 9. Test Errors insertion
INSERT INTO sentinel_errors (
    session_id, visitor_id, error_type, message, page_url
) VALUES (
    'test-session-xyz-123', 'test-visitor-abc-987', 'js_error', 'Uncaught ReferenceError: foo is not defined', '/'
);

-- 10. Audit view responses
DO $$
BEGIN
    ASSERT (SELECT count(*) FROM sentinel_v_live WHERE session_id = 'test-session-xyz-123') = 1, 'View sentinel_v_live failed to retrieve live test session';
    ASSERT (SELECT count(*) FROM sentinel_v_daily WHERE day = CURRENT_DATE) >= 1, 'View sentinel_v_daily failed to return aggregated results for today';
END $$;

-- Print gorgeous results
SELECT 
  '✔ TABLAS EXISTEN' as status, 'Tablas principales encontradas en public' as description
UNION ALL
SELECT 
  '✔ INSERTAR SESION' as status, 'Insercion exitosa de nueva sesion con restricciones' as description
UNION ALL
SELECT 
  '✔ ACTIVACION DE TRIGGER' as status, 'El trigger sentinel_touch_session actualiza correctamente contadores del DOM' as description
UNION ALL
SELECT 
  '✔ DETECCION DE REBOTE' as status, 'Transicion automatica de rebote (bounced=false) tras multiples clics' as description
UNION ALL
SELECT 
  '✔ TABLA RENDIMIENTO' as status, 'Insercion correcta de Core Web Vitals (FCP, LCP, CLS)' as description
UNION ALL
SELECT 
  '✔ TABLA ERRORES' as status, 'Insercion correcta de excepciones JavaScript capturadas' as description
UNION ALL
SELECT 
  '✔ VISTAS DASHBOARD' as status, 'Vistas sentinel_v_live y sentinel_v_daily mapeando datos correctamente' as description;

ROLLBACK;
