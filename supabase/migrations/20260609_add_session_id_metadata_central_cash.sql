-- Migration: Agregar trazabilidad y metadata a Caja Central
-- Description: payment_method, session_id FK, metadata JSONB + RPC de backfill
-- Feature: 008-digital-central-cash

-- ============================================================================
-- 1. NUEVAS COLUMNAS
-- ============================================================================

-- payment_method: clasifica cada movimiento por método de pago
ALTER TABLE public.central_cash_movements
ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Migrar movimientos legacy sin método: se asume efectivo
UPDATE public.central_cash_movements
SET payment_method = 'cash'
WHERE payment_method IS NULL;

-- Agregar CHECK constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ccm_payment_method_check'
    ) THEN
        ALTER TABLE public.central_cash_movements
        ADD CONSTRAINT ccm_payment_method_check
        CHECK (payment_method IN ('cash', 'transfer', 'card', 'mixed'));
    END IF;
END $$;

-- session_id: trazabilidad al turno de caja
ALTER TABLE public.central_cash_movements
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.cash_sessions(id) ON DELETE SET NULL;

-- metadata: desglose JSONB de orígenes del dinero
ALTER TABLE public.central_cash_movements
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- ============================================================================
-- 2. ÍNDICES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_central_cash_session_id
ON public.central_cash_movements(session_id);

CREATE INDEX IF NOT EXISTS idx_central_cash_payment_method
ON public.central_cash_movements(payment_method);

CREATE INDEX IF NOT EXISTS idx_central_cash_created_at
ON public.central_cash_movements(created_at);

-- ============================================================================
-- 3. RPC: BACKFILL DE SESIONES HISTÓRICAS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.backfill_central_cash_sessions(
    p_business_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session RECORD;
    v_existing_id UUID;
    v_cash_sales NUMERIC := 0;
    v_transfer_sales NUMERIC := 0;
    v_card_sales NUMERIC := 0;
    v_cash_abonos NUMERIC := 0;
    v_transfer_abonos NUMERIC := 0;
    v_card_abonos NUMERIC := 0;
    v_cash_loan_payments NUMERIC := 0;
    v_transfer_loan_payments NUMERIC := 0;
    v_cash_other NUMERIC := 0;
    v_transfer_other NUMERIC := 0;
    v_commissions_paid NUMERIC := 0;
    v_total_amount NUMERIC := 0;
    v_metadata JSONB;
    v_processed INTEGER := 0;
    v_skipped INTEGER := 0;
BEGIN
    -- Paso 0: Asegurar que movimientos legacy tengan payment_method
    UPDATE public.central_cash_movements
    SET payment_method = 'cash'
    WHERE payment_method IS NULL
      AND business_id = p_business_id;

    -- Iterar sobre sesiones cerradas del negocio
    FOR v_session IN
        SELECT cs.id, cs.opened_at, cs.closed_at, cs.opening_balance
        FROM public.cash_sessions cs
        WHERE cs.business_id = p_business_id
          AND cs.status = 'closed'
        ORDER BY cs.closed_at ASC
    LOOP
        -- Verificar si ya existe un movimiento con este session_id
        SELECT id INTO v_existing_id
        FROM public.central_cash_movements
        WHERE session_id = v_session.id
          AND business_id = p_business_id
        LIMIT 1;

        IF FOUND THEN
            v_skipped := v_skipped + 1;
            CONTINUE;
        END IF;

        -- === Calcular metadata desde las ventas ===

        -- Ventas en efectivo (incluyendo mixed)
        SELECT COALESCE(SUM(
            CASE
                WHEN s.payment_method = 'mixed' THEN COALESCE(s.cash_amount, 0)
                WHEN s.payment_method = 'cash' THEN s.total_amount + COALESCE((s.metadata->>'tip_amount')::NUMERIC, 0)
                ELSE 0
            END
        ), 0) INTO v_cash_sales
        FROM public.sales s
        WHERE s.session_id = v_session.id
          AND s.status = 'completed'
          AND s.business_id = p_business_id;

        -- Ventas por transferencia (incluyendo mixed)
        SELECT COALESCE(SUM(
            CASE
                WHEN s.payment_method = 'mixed' THEN COALESCE(s.transfer_amount, 0)
                WHEN s.payment_method = 'transfer' THEN s.total_amount + COALESCE((s.metadata->>'tip_amount')::NUMERIC, 0)
                ELSE 0
            END
        ), 0) INTO v_transfer_sales
        FROM public.sales s
        WHERE s.session_id = v_session.id
          AND s.status = 'completed'
          AND s.business_id = p_business_id;

        -- Ventas por tarjeta (incluyendo mixed)
        SELECT COALESCE(SUM(
            CASE
                WHEN s.payment_method = 'mixed' THEN COALESCE(s.card_amount, 0)
                WHEN s.payment_method = 'card' THEN s.total_amount + COALESCE((s.metadata->>'tip_amount')::NUMERIC, 0)
                ELSE 0
            END
        ), 0) INTO v_card_sales
        FROM public.sales s
        WHERE s.session_id = v_session.id
          AND s.status = 'completed'
          AND s.business_id = p_business_id;

        -- Abonos de cartera — efectivo
        SELECT COALESCE(SUM(dp.amount), 0) INTO v_cash_abonos
        FROM public.debt_payments dp
        WHERE dp.cash_session_id = v_session.id
          AND dp.payment_method = 'cash'
          AND dp.business_id = p_business_id;

        -- Abonos de cartera — transferencia/tarjeta
        SELECT COALESCE(SUM(dp.amount), 0) INTO v_transfer_abonos
        FROM public.debt_payments dp
        WHERE dp.cash_session_id = v_session.id
          AND dp.payment_method IN ('transfer', 'card')
          AND dp.business_id = p_business_id;

        -- card_abonos no se usa actualmente, pero se reserva
        v_card_abonos := 0;

        -- Pagos de préstamos de trabajadores (todos son en efectivo — la tabla no tiene payment_method)
        SELECT COALESCE(SUM(wlp.amount), 0) INTO v_cash_loan_payments
        FROM public.worker_loan_payments wlp
        WHERE wlp.cash_session_id = v_session.id
          AND wlp.business_id = p_business_id;

        -- transfer_loan_payments: no existe método de pago en worker_loan_payments, siempre 0
        v_transfer_loan_payments := 0;

        -- Otros ingresos (movimientos manuales de caja — no tienen payment_method, son efectivo)
        SELECT COALESCE(SUM(cm.amount), 0) INTO v_cash_other
        FROM public.cash_movements cm
        WHERE cm.session_id = v_session.id
          AND cm.type = 'income'
          AND cm.business_id = p_business_id;

        -- transfer_other: cash_movements no tiene payment_method, siempre 0
        v_transfer_other := 0;

        -- Comisiones pagadas en el turno
        SELECT COALESCE(SUM(wc.commission_amount), 0) INTO v_commissions_paid
        FROM public.worker_commissions wc
        JOIN public.sales s ON s.id = wc.sale_id
        WHERE s.session_id = v_session.id
          AND wc.status = 'paid'
          AND wc.business_id = p_business_id;

        -- === Construir metadata y amount total ===
        v_metadata := jsonb_build_object(
            'cash_sales', v_cash_sales,
            'transfer_sales', v_transfer_sales,
            'card_sales', v_card_sales,
            'cash_abonos', v_cash_abonos,
            'transfer_abonos', v_transfer_abonos,
            'card_abonos', v_card_abonos,
            'cash_loan_payments', v_cash_loan_payments,
            'transfer_loan_payments', v_transfer_loan_payments,
            'cash_other', v_cash_other,
            'transfer_other', v_transfer_other,
            'commissions_paid', v_commissions_paid
        );

        -- Total = suma de todos los ingresos (cash + transfer + card)
        v_total_amount := v_cash_sales + v_transfer_sales + v_card_sales
                        + v_cash_abonos + v_transfer_abonos + v_card_abonos
                        + v_cash_loan_payments + v_transfer_loan_payments
                        + v_cash_other + v_transfer_other;

        -- Solo insertar si hay monto > 0
        IF v_total_amount > 0 THEN
            INSERT INTO public.central_cash_movements (
                business_id,
                type,
                amount,
                description,
                payment_method,
                session_id,
                metadata,
                created_at
            ) VALUES (
                p_business_id,
                'income',
                v_total_amount,
                'Cierre de Sesión #' || LEFT(v_session.id::TEXT, 8) || ' — ' || TO_CHAR(v_session.closed_at, 'DD Mon YYYY HH24:MI'),
                'mixed',
                v_session.id,
                v_metadata,
                v_session.closed_at  -- usar fecha de cierre de la sesión como created_at
            );

            v_processed := v_processed + 1;
        ELSE
            v_skipped := v_skipped + 1;
        END IF;

    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'processed', v_processed,
        'skipped', v_skipped,
        'message', v_processed::TEXT || ' sesiones procesadas, ' || v_skipped::TEXT || ' omitidas.'
    );
END;
$$;
