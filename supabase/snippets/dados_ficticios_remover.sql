-- Remove os dados fictícios criados por supabase/snippets/dados_ficticios.sql.
--
-- Uso (banco local, via psql):
--   psql -v email=usuario@exemplo.com -f supabase/snippets/dados_ficticios_remover.sql
--
-- - Remove somente os registros com os IDs determinísticos do script de criação.
-- - Clientes, serviços e produtos já usados em orçamentos são mantidos para
--   preservar o histórico (Modelo Físico v1.1, seção 17); o script informa quantos.
-- - Endereços são removidos junto com o cliente (ON DELETE CASCADE).

SELECT set_config('seed.email', :'email', false);

BEGIN;

DO $$
DECLARE
  v_usuario_id UUID;
  v_removidos INTEGER;
  v_mantidos INTEGER;
BEGIN
  SELECT u.id INTO v_usuario_id
  FROM public.usuario u
  JOIN auth.users a ON a.id = u.id
  WHERE lower(a.email) = lower(current_setting('seed.email'));

  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'Usuário com e-mail % não encontrado em usuario/auth.users.', current_setting('seed.email');
  END IF;

  -- Clientes 1..15
  DELETE FROM public.cliente c
  WHERE c.usuario_id = v_usuario_id
    AND c.id IN (SELECT md5(v_usuario_id || ':ficticio:cliente:' || n)::uuid FROM generate_series(1, 15) n)
    AND NOT EXISTS (SELECT 1 FROM public.orcamento o WHERE o.cliente_id = c.id);
  GET DIAGNOSTICS v_removidos = ROW_COUNT;
  SELECT count(*) INTO v_mantidos FROM public.cliente c
  WHERE c.id IN (SELECT md5(v_usuario_id || ':ficticio:cliente:' || n)::uuid FROM generate_series(1, 15) n);
  RAISE NOTICE 'Clientes removidos: %, mantidos por uso em orçamentos: %', v_removidos, v_mantidos;

  -- Serviços 1..10
  DELETE FROM public.servico s
  WHERE s.usuario_id = v_usuario_id
    AND s.id IN (SELECT md5(v_usuario_id || ':ficticio:servico:' || n)::uuid FROM generate_series(1, 10) n)
    AND NOT EXISTS (SELECT 1 FROM public.item_orcamento i WHERE i.servico_id = s.id);
  GET DIAGNOSTICS v_removidos = ROW_COUNT;
  SELECT count(*) INTO v_mantidos FROM public.servico s
  WHERE s.id IN (SELECT md5(v_usuario_id || ':ficticio:servico:' || n)::uuid FROM generate_series(1, 10) n);
  RAISE NOTICE 'Serviços removidos: %, mantidos por uso em orçamentos: %', v_removidos, v_mantidos;

  -- Produtos 1..12
  DELETE FROM public.produto p
  WHERE p.usuario_id = v_usuario_id
    AND p.id IN (SELECT md5(v_usuario_id || ':ficticio:produto:' || n)::uuid FROM generate_series(1, 12) n)
    AND NOT EXISTS (SELECT 1 FROM public.item_orcamento i WHERE i.produto_id = p.id);
  GET DIAGNOSTICS v_removidos = ROW_COUNT;
  SELECT count(*) INTO v_mantidos FROM public.produto p
  WHERE p.id IN (SELECT md5(v_usuario_id || ':ficticio:produto:' || n)::uuid FROM generate_series(1, 12) n);
  RAISE NOTICE 'Produtos removidos: %, mantidos por uso em orçamentos: %', v_removidos, v_mantidos;
END $$;

COMMIT;
