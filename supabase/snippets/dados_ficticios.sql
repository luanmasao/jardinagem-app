-- Dados fictícios para desenvolvimento: clientes, endereços, serviços e produtos.
--
-- Uso (banco local, via psql):
--   psql -v email=usuario@exemplo.com -f supabase/snippets/dados_ficticios.sql
--
-- - Os registros pertencem ao usuário do e-mail informado (auth.users -> usuario).
-- - Os IDs são determinísticos (md5 de usuario_id + tipo + número), então rodar
--   o script novamente não duplica dados (ON CONFLICT DO NOTHING).
-- - Para remover: supabase/snippets/dados_ficticios_remover.sql
-- - Todos os dados são inventados: e-mails em example.com, telefones e
--   documentos sem titular real.

SELECT set_config('seed.email', :'email', false);

BEGIN;

DO $$
DECLARE
  v_usuario_id UUID;
BEGIN
  SELECT u.id INTO v_usuario_id
  FROM public.usuario u
  JOIN auth.users a ON a.id = u.id
  WHERE lower(a.email) = lower(current_setting('seed.email'));

  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'Usuário com e-mail % não encontrado em usuario/auth.users.', current_setting('seed.email');
  END IF;

  -- Clientes (2 inativos)
  INSERT INTO public.cliente (id, usuario_id, nome, telefone, email, documento, observacoes, ativo)
  SELECT md5(v_usuario_id || ':ficticio:cliente:' || c.n)::uuid, v_usuario_id, c.nome, c.telefone, c.email, c.documento, c.observacoes, c.ativo
  FROM (VALUES
    (1,  'Ana Beatriz Moura',        '71900000101', 'ana.moura@example.com',        '000.000.101-01', 'Portão lateral, tocar interfone 2.',            TRUE),
    (2,  'Carlos Eduardo Ramos',     '71900000102', 'carlos.ramos@example.com',     '000.000.102-02', 'Prefere atendimento pela manhã.',               TRUE),
    (3,  'Condomínio Jardim das Palmeiras', '71900000103', 'sindico.palmeiras@example.com', '00.000.103/0001-03', 'Falar com o síndico antes de iniciar.', TRUE),
    (4,  'Fernanda Lima Costa',      '71900000104', 'fernanda.costa@example.com',   '000.000.104-04', NULL,                                            TRUE),
    (5,  'Gustavo Henrique Prado',   '71900000105', NULL,                           NULL,             'Cachorro no quintal.',                          TRUE),
    (6,  'Helena Duarte',            '71900000106', 'helena.duarte@example.com',    '000.000.106-06', 'Jardim vertical na varanda.',                   TRUE),
    (7,  'Igor Nascimento',          '71900000107', 'igor.nascimento@example.com',  NULL,             NULL,                                            TRUE),
    (8,  'Juliana Teixeira Rocha',   '71900000108', 'juliana.rocha@example.com',    '000.000.108-08', 'Manutenção mensal do gramado.',                 TRUE),
    (9,  'Restaurante Sabor do Mar', '71900000109', 'contato.sabordomar@example.com', '00.000.109/0001-09', 'Atendimento somente às segundas-feiras.', TRUE),
    (10, 'Leonardo Batista',         '71900000110', NULL,                           NULL,             NULL,                                            TRUE),
    (11, 'Mariana Alves Pereira',    '71900000111', 'mariana.pereira@example.com',  '000.000.111-11', 'Quer orçamento para paisagismo completo.',      TRUE),
    (12, 'Otávio Santana',           '71900000112', 'otavio.santana@example.com',   NULL,             NULL,                                            TRUE),
    (13, 'Patrícia Mendes',          '71900000113', 'patricia.mendes@example.com',  '000.000.113-13', 'Área com declive acentuado.',                   TRUE),
    (14, 'Rafael Cardoso',           '71900000114', NULL,                           NULL,             'Cliente mudou de cidade.',                      FALSE),
    (15, 'Sílvia Rezende',           '71900000115', 'silvia.rezende@example.com',   '000.000.115-15', 'Contrato encerrado.',                           FALSE)
  ) AS c(n, nome, telefone, email, documento, observacoes, ativo)
  ON CONFLICT (id) DO NOTHING;

  -- Endereços (10 clientes; os demais ficam sem endereço). Coordenadas aproximadas em Salvador-BA.
  INSERT INTO public.endereco (id, cliente_id, cep, logradouro, numero, complemento, bairro, cidade, estado, latitude, longitude)
  SELECT md5(v_usuario_id || ':ficticio:endereco:' || e.n)::uuid,
         md5(v_usuario_id || ':ficticio:cliente:' || e.n)::uuid,
         e.cep, e.logradouro, e.numero, e.complemento, e.bairro, 'Salvador', 'BA', e.latitude, e.longitude
  FROM (VALUES
    (1,  '40140-130', 'Avenida Oceânica',              '1001', 'Casa',      'Barra',               -13.010500, -38.532000),
    (2,  '40170-010', 'Rua Professor Fernando Luz',    '210',  NULL,        'Ondina',              -13.008000, -38.510000),
    (3,  '41830-000', 'Avenida Tancredo Neves',        '3000', 'Bloco A',   'Caminho das Árvores', -12.981000, -38.456000),
    (4,  '41810-000', 'Rua das Hortênsias',            '45',   NULL,        'Pituba',              -12.999000, -38.458000),
    (6,  '41940-000', 'Rua Fonte do Boi',              '88',   'Apto 302',  'Rio Vermelho',        -13.012000, -38.490000),
    (8,  '41815-000', 'Rua Rubens Guelli',             '150',  NULL,        'Itaigara',            -12.988000, -38.463000),
    (9,  '41770-000', 'Avenida Otávio Mangabeira',     '5400', 'Loja 1',    'Stiep',               -12.997000, -38.444000),
    (11, '41720-000', 'Rua das Gaivotas',              '12',   'Casa 3',    'Imbuí',               -12.970000, -38.433000),
    (13, '41680-000', 'Rua Praia de Itapoan',          '77',   NULL,        'Patamares',           -12.959000, -38.404000),
    (14, '41650-000', 'Rua da Paz',                    '9',    NULL,        'Piatã',               -12.950000, -38.388000)
  ) AS e(n, cep, logradouro, numero, complemento, bairro, latitude, longitude)
  ON CONFLICT (id) DO NOTHING;

  -- Serviços (serviços com medição de área usam sempre 'm²'; 1 inativo)
  INSERT INTO public.servico (id, usuario_id, nome, descricao, unidade, preco_base, usa_medicao_area, ativo)
  SELECT md5(v_usuario_id || ':ficticio:servico:' || s.n)::uuid, v_usuario_id, s.nome, s.descricao, s.unidade, s.preco_base, s.usa_medicao_area, s.ativo
  FROM (VALUES
    (1,  'Roçagem de terreno',           'Roçagem com roçadeira e recolhimento do material.',      'm²',     2.50,   TRUE,  TRUE),
    (2,  'Plantio de grama esmeralda',   'Preparo do solo e assentamento das placas.',              'm²',     12.00,  TRUE,  TRUE),
    (3,  'Aparação de gramado',          'Corte com cortador e acabamento nas bordas.',             'm²',     1.80,   TRUE,  TRUE),
    (4,  'Adubação de gramado',          'Aplicação de adubo granulado e irrigação.',               'm²',     1.20,   TRUE,  TRUE),
    (5,  'Limpeza de canteiros',         'Remoção de ervas daninhas e folhas secas.',               'm²',     3.50,   TRUE,  TRUE),
    (6,  'Instalação de forração',       'Aplicação de casca de pinus ou pedrisco.',                'm²',     6.00,   TRUE,  TRUE),
    (7,  'Poda de árvore de pequeno porte', 'Poda de formação ou limpeza, até 4 metros.',           'un',     150.00, FALSE, TRUE),
    (8,  'Poda de cerca viva',           'Poda e modelagem de cerca viva.',                         'h',      60.00,  FALSE, TRUE),
    (9,  'Visita técnica',               'Avaliação do jardim e recomendações.',                    'visita', 80.00,  FALSE, TRUE),
    (10, 'Dedetização de jardim',        'Serviço descontinuado.',                                  'visita', 120.00, FALSE, FALSE)
  ) AS s(n, nome, descricao, unidade, preco_base, usa_medicao_area, ativo)
  ON CONFLICT (id) DO NOTHING;

  -- Produtos (1 inativo)
  INSERT INTO public.produto (id, usuario_id, nome, descricao, unidade, preco_base, ativo)
  SELECT md5(v_usuario_id || ':ficticio:produto:' || p.n)::uuid, v_usuario_id, p.nome, p.descricao, p.unidade, p.preco_base, p.ativo
  FROM (VALUES
    (1,  'Adubo NPK 10-10-10',        'Adubo granulado de uso geral.',            'kg',    9.90,  TRUE),
    (2,  'Substrato para plantas',    'Saco de 20 kg.',                           'saco',  24.90, TRUE),
    (3,  'Grama esmeralda em placa',  'Placa de aproximadamente 0,40 x 0,60 m.',  'm²',    8.50,  TRUE),
    (4,  'Muda de ixora',             'Muda em vaso de 15 cm.',                   'un',    12.00, TRUE),
    (5,  'Muda de palmeira areca',    'Muda com cerca de 1 metro.',               'un',    45.00, TRUE),
    (6,  'Casca de pinus',            'Saco de 50 litros para forração.',         'saco',  29.90, TRUE),
    (7,  'Pedrisco branco',           'Saco de 20 kg para decoração.',            'saco',  18.50, TRUE),
    (8,  'Calcário dolomítico',       'Correção da acidez do solo.',              'kg',    2.80,  TRUE),
    (9,  'Fertilizante foliar',       'Frasco de 1 litro.',                       'L',     34.00, TRUE),
    (10, 'Areia lavada',              'Areia média para preparo do solo.',        'm³',    120.00, TRUE),
    (11, 'Manta de bidim',            'Manta geotêxtil para drenagem.',           'm²',    6.90,  TRUE),
    (12, 'Inseticida granulado',      'Produto fora de linha.',                   'kg',    39.90, FALSE)
  ) AS p(n, nome, descricao, unidade, preco_base, ativo)
  ON CONFLICT (id) DO NOTHING;
END $$;

COMMIT;
