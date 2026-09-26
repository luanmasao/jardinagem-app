-- Migration: 20260921000000_auth_rls.sql
-- Descrição: Implementação de Supabase Auth + PostgreSQL Row Level Security (RLS)
-- SGBD: PostgreSQL 15+ (Supabase)
-- Status: HOMOLOGADA
-- Data de Criação: 2026-09-20
-- Fontes Canônicas:
--   - docs/relatorios/auth-rls-strategy-v1.6.md (HOMOLOGADA)
--   - docs/relatorios/auth-rls-implementation-plan-v1.0.md (HOMOLOGADA)
--   - docs/relatorios/auth-rls-implementation-plan-v1.0-final-audit.md
--   - docs/relatorios/auth-rls-implementation-plan-v1.0-homologation.md
--
-- Governança e Regras de Segurança:
--   1. Schema private isolado, fora da publicação da Data API (PostgREST expõe exclusivamente public).
--   2. Função private.handle_new_user() com SECURITY DEFINER, executando sob FUNCTION OWNER postgres,
--      com SET search_path = '' estático para proteção contra search path hijacking e referências schema-qualified.
--   3. Menor privilégio: REVOKE ALL FROM PUBLIC; REVOKE EXECUTE FROM anon, authenticated.
--   4. Trigger nativa on_auth_user_created disparada em AFTER INSERT ON auth.users.
--   5. Ativação estrita de ENABLE ROW LEVEL SECURITY nas 8 tabelas de domínio, sem FORCE ROW LEVEL SECURITY.
--   6. Exatamente 31 policies (19 de titularidade direta + 12 de titularidade por cadeia).
--   7. Tabela usuario: 3 policies (SELECT, INSERT, UPDATE); DELETE ausente por Default Deny (Decisão D1).
--   8. DELETE em orcamento, item_orcamento e area condicionado a status = 'RASCUNHO' (Decisão D2).
--   9. Regras anti-cross-tenant em orcamento (cliente_id) e item_orcamento (servico_id / produto_id).
--   10. Navegação por cadeia relacional pura sem colunas redundantes de titularidade.

-- ============================================================================
-- 1. SCHEMA PRIVADO
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS private;

-- ============================================================================
-- 2. FUNÇÃO DE BOOTSTRAP TRANSACIONAL (SECURITY DEFINER)
-- ============================================================================

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Validação mandatória do nome do profissional/empresa
  IF NEW.raw_user_meta_data->>'nome' IS NULL OR trim(NEW.raw_user_meta_data->>'nome') = '' THEN
    RAISE EXCEPTION 'Nome do usuário é obrigatório para criação do perfil.';
  END IF;

  -- Inserção segura e estritamente qualificada no schema public
  INSERT INTO public.usuario (id, nome, telefone)
  VALUES (
    NEW.id,
    trim(NEW.raw_user_meta_data->>'nome'),
    nullif(trim(NEW.raw_user_meta_data->>'telefone'), '')
  );

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. MENOR PRIVILÉGIO NA FUNÇÃO DE BOOTSTRAP
-- ============================================================================

REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.handle_new_user() FROM anon, authenticated;

-- ============================================================================
-- 4. TRIGGER NATIVA NO SCHEMA AUTH
-- ============================================================================

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

-- ============================================================================
-- 5. POLICIES DE TITULARIDADE DIRETA (19 POLICIES)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5.1. USUARIO (3 policies — DELETE ausente por Default Deny estrito)
-- ----------------------------------------------------------------------------
ALTER TABLE public.usuario ENABLE ROW LEVEL SECURITY;

CREATE POLICY usuario_select_policy ON public.usuario
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

CREATE POLICY usuario_insert_policy ON public.usuario
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY usuario_update_policy ON public.usuario
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- 5.2. CLIENTE (4 policies)
-- ----------------------------------------------------------------------------
ALTER TABLE public.cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY cliente_select_policy ON public.cliente
    FOR SELECT TO authenticated
    USING (auth.uid() = usuario_id);

CREATE POLICY cliente_insert_policy ON public.cliente
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY cliente_update_policy ON public.cliente
    FOR UPDATE TO authenticated
    USING (auth.uid() = usuario_id)
    WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY cliente_delete_policy ON public.cliente
    FOR DELETE TO authenticated
    USING (auth.uid() = usuario_id);

-- ----------------------------------------------------------------------------
-- 5.3. SERVICO (4 policies)
-- ----------------------------------------------------------------------------
ALTER TABLE public.servico ENABLE ROW LEVEL SECURITY;

CREATE POLICY servico_select_policy ON public.servico
    FOR SELECT TO authenticated
    USING (auth.uid() = usuario_id);

CREATE POLICY servico_insert_policy ON public.servico
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY servico_update_policy ON public.servico
    FOR UPDATE TO authenticated
    USING (auth.uid() = usuario_id)
    WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY servico_delete_policy ON public.servico
    FOR DELETE TO authenticated
    USING (auth.uid() = usuario_id);

-- ----------------------------------------------------------------------------
-- 5.4. PRODUTO (4 policies)
-- ----------------------------------------------------------------------------
ALTER TABLE public.produto ENABLE ROW LEVEL SECURITY;

CREATE POLICY produto_select_policy ON public.produto
    FOR SELECT TO authenticated
    USING (auth.uid() = usuario_id);

CREATE POLICY produto_insert_policy ON public.produto
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY produto_update_policy ON public.produto
    FOR UPDATE TO authenticated
    USING (auth.uid() = usuario_id)
    WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY produto_delete_policy ON public.produto
    FOR DELETE TO authenticated
    USING (auth.uid() = usuario_id);

-- ----------------------------------------------------------------------------
-- 5.5. ORCAMENTO (4 policies — DELETE condicionado a status = 'RASCUNHO')
-- ----------------------------------------------------------------------------
ALTER TABLE public.orcamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY orcamento_select_policy ON public.orcamento
    FOR SELECT TO authenticated
    USING (auth.uid() = usuario_id);

CREATE POLICY orcamento_insert_policy ON public.orcamento
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = usuario_id AND
        EXISTS (
            SELECT 1 FROM public.cliente c
            WHERE c.id = cliente_id AND c.usuario_id = auth.uid()
        )
    );

CREATE POLICY orcamento_update_policy ON public.orcamento
    FOR UPDATE TO authenticated
    USING (auth.uid() = usuario_id)
    WITH CHECK (
        auth.uid() = usuario_id AND
        EXISTS (
            SELECT 1 FROM public.cliente c
            WHERE c.id = cliente_id AND c.usuario_id = auth.uid()
        )
    );

CREATE POLICY orcamento_delete_policy ON public.orcamento
    FOR DELETE TO authenticated
    USING (auth.uid() = usuario_id AND status = 'RASCUNHO');

-- ============================================================================
-- 6. POLICIES DE TITULARIDADE POR CADEIA (12 POLICIES)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 6.1. ENDERECO (4 policies por cadeia simples via cliente)
-- ----------------------------------------------------------------------------
ALTER TABLE public.endereco ENABLE ROW LEVEL SECURITY;

CREATE POLICY endereco_select_policy ON public.endereco
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cliente c
            WHERE c.id = endereco.cliente_id AND c.usuario_id = auth.uid()
        )
    );

CREATE POLICY endereco_insert_policy ON public.endereco
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cliente c
            WHERE c.id = cliente_id AND c.usuario_id = auth.uid()
        )
    );

CREATE POLICY endereco_update_policy ON public.endereco
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cliente c
            WHERE c.id = endereco.cliente_id AND c.usuario_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cliente c
            WHERE c.id = cliente_id AND c.usuario_id = auth.uid()
        )
    );

CREATE POLICY endereco_delete_policy ON public.endereco
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cliente c
            WHERE c.id = endereco.cliente_id AND c.usuario_id = auth.uid()
        )
    );

-- ----------------------------------------------------------------------------
-- 6.2. ITEM_ORCAMENTO (4 policies por cadeia simples via orcamento)
-- ----------------------------------------------------------------------------
ALTER TABLE public.item_orcamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY item_orcamento_select_policy ON public.item_orcamento
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orcamento o
            WHERE o.id = item_orcamento.orcamento_id AND o.usuario_id = auth.uid()
        )
    );

CREATE POLICY item_orcamento_insert_policy ON public.item_orcamento
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orcamento o
            WHERE o.id = orcamento_id AND o.usuario_id = auth.uid()
        ) AND
        (servico_id IS NULL OR EXISTS (
            SELECT 1 FROM public.servico s
            WHERE s.id = servico_id AND s.usuario_id = auth.uid()
        )) AND
        (produto_id IS NULL OR EXISTS (
            SELECT 1 FROM public.produto p
            WHERE p.id = produto_id AND p.usuario_id = auth.uid()
        ))
    );

CREATE POLICY item_orcamento_update_policy ON public.item_orcamento
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orcamento o
            WHERE o.id = item_orcamento.orcamento_id AND o.usuario_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orcamento o
            WHERE o.id = orcamento_id AND o.usuario_id = auth.uid()
        ) AND
        (servico_id IS NULL OR EXISTS (
            SELECT 1 FROM public.servico s
            WHERE s.id = servico_id AND s.usuario_id = auth.uid()
        )) AND
        (produto_id IS NULL OR EXISTS (
            SELECT 1 FROM public.produto p
            WHERE p.id = produto_id AND p.usuario_id = auth.uid()
        ))
    );

CREATE POLICY item_orcamento_delete_policy ON public.item_orcamento
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orcamento o
            WHERE o.id = item_orcamento.orcamento_id
              AND o.usuario_id = auth.uid()
              AND o.status = 'RASCUNHO'
        )
    );

-- ----------------------------------------------------------------------------
-- 6.3. AREA (4 policies por cadeia dupla via item_orcamento -> orcamento)
-- ----------------------------------------------------------------------------
ALTER TABLE public.area ENABLE ROW LEVEL SECURITY;

CREATE POLICY area_select_policy ON public.area
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.item_orcamento io
            JOIN public.orcamento o ON o.id = io.orcamento_id
            WHERE io.id = area.item_orcamento_id AND o.usuario_id = auth.uid()
        )
    );

CREATE POLICY area_insert_policy ON public.area
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.item_orcamento io
            JOIN public.orcamento o ON o.id = io.orcamento_id
            WHERE io.id = item_orcamento_id AND o.usuario_id = auth.uid()
        )
    );

CREATE POLICY area_update_policy ON public.area
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.item_orcamento io
            JOIN public.orcamento o ON o.id = io.orcamento_id
            WHERE io.id = area.item_orcamento_id AND o.usuario_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.item_orcamento io
            JOIN public.orcamento o ON o.id = io.orcamento_id
            WHERE io.id = item_orcamento_id AND o.usuario_id = auth.uid()
        )
    );

CREATE POLICY area_delete_policy ON public.area
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.item_orcamento io
            JOIN public.orcamento o ON o.id = io.orcamento_id
            WHERE io.id = area.item_orcamento_id
              AND o.usuario_id = auth.uid()
              AND o.status = 'RASCUNHO'
        )
    );
