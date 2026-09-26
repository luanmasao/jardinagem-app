-- Migration: 20260916020500_modelo_fisico_v1_1.sql
-- Descrição: Materialização do Modelo Físico v1.1 do Sistema de Orçamentos para Jardinagem
-- SGBD: PostgreSQL (Supabase)
-- Extensão Espacial: PostGIS
-- Fontes oficiais: docs/modelo-fisico-v1.1.md, docs/uml/der.puml

-- ============================================================================
-- 1. EXTENSÕES
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================================
-- 2. ENUMS / TIPOS CUSTOMIZADOS
-- ============================================================================

CREATE TYPE status_orcamento AS ENUM (
    'RASCUNHO',
    'ENVIADO',
    'EM_ANALISE',
    'APROVADO',
    'RECUSADO',
    'EXPIRADO',
    'CANCELADO',
    'CONCLUIDO'
);

CREATE TYPE tipo_desconto AS ENUM (
    'PERCENTUAL',
    'FIXO'
);

CREATE TYPE tipo_item AS ENUM (
    'SERVICO',
    'PRODUTO'
);

-- ============================================================================
-- 3. TABELAS
-- ============================================================================

-- 3.1. USUARIO
CREATE TABLE usuario (
    id UUID PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    telefone VARCHAR(30),
    data_cadastro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ativo BOOLEAN NOT NULL DEFAULT TRUE
);

-- 3.2. CLIENTE
CREATE TABLE cliente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
    nome VARCHAR(150) NOT NULL,
    telefone VARCHAR(30),
    email VARCHAR(255),
    documento VARCHAR(30),
    observacoes TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE
);

-- 3.3. ENDERECO
CREATE TABLE endereco (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL UNIQUE REFERENCES cliente(id) ON DELETE CASCADE,
    cep VARCHAR(10),
    logradouro VARCHAR(200),
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    latitude NUMERIC(9,6),
    longitude NUMERIC(9,6),
    CONSTRAINT endereco_latitude_check CHECK (latitude IS NULL OR (latitude >= -90.0 AND latitude <= 90.0)),
    CONSTRAINT endereco_longitude_check CHECK (longitude IS NULL OR (longitude >= -180.0 AND longitude <= 180.0))
);

-- 3.4. SERVICO
CREATE TABLE servico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    unidade VARCHAR(30) NOT NULL,
    preco_base NUMERIC(10,2) NOT NULL,
    usa_medicao_area BOOLEAN NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT servico_preco_base_check CHECK (preco_base >= 0)
);

-- 3.5. PRODUTO
CREATE TABLE produto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    unidade VARCHAR(30) NOT NULL,
    preco_base NUMERIC(10,2) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT produto_preco_base_check CHECK (preco_base >= 0)
);

-- 3.6. ORCAMENTO
CREATE TABLE orcamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
    cliente_id UUID NOT NULL REFERENCES cliente(id) ON DELETE RESTRICT,
    numero VARCHAR(30) NOT NULL,
    data_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    data_validade DATE,
    status status_orcamento NOT NULL DEFAULT 'RASCUNHO',
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tipo_desconto tipo_desconto,
    valor_desconto NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    observacoes TEXT,
    condicoes_pagamento TEXT,
    CONSTRAINT orcamento_usuario_id_numero_key UNIQUE (usuario_id, numero),
    CONSTRAINT orcamento_subtotal_check CHECK (subtotal >= 0),
    CONSTRAINT orcamento_valor_desconto_check CHECK (valor_desconto >= 0),
    CONSTRAINT orcamento_total_check CHECK (total >= 0),
    CONSTRAINT orcamento_desconto_check CHECK (
        (tipo_desconto IS NULL AND valor_desconto = 0) OR
        (tipo_desconto = 'PERCENTUAL' AND valor_desconto >= 0 AND valor_desconto <= 100) OR
        (tipo_desconto = 'FIXO' AND valor_desconto >= 0 AND valor_desconto <= subtotal)
    )
);

-- 3.7. ITEM_ORCAMENTO
CREATE TABLE item_orcamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orcamento_id UUID NOT NULL REFERENCES orcamento(id) ON DELETE RESTRICT,
    servico_id UUID REFERENCES servico(id) ON DELETE RESTRICT,
    produto_id UUID REFERENCES produto(id) ON DELETE RESTRICT,
    tipo tipo_item NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    quantidade NUMERIC(12,2) NOT NULL,
    unidade VARCHAR(30) NOT NULL,
    valor_unitario NUMERIC(12,2) NOT NULL,
    valor_total NUMERIC(12,2) NOT NULL,
    usa_medicao_area BOOLEAN NOT NULL,
    CONSTRAINT item_orcamento_quantidade_check CHECK (quantidade >= 0),
    CONSTRAINT item_orcamento_valor_unitario_check CHECK (valor_unitario >= 0),
    CONSTRAINT item_orcamento_valor_total_check CHECK (valor_total >= 0),
    CONSTRAINT item_orcamento_servico_xor_produto_check CHECK (
        (tipo = 'SERVICO' AND servico_id IS NOT NULL AND produto_id IS NULL) OR
        (tipo = 'PRODUTO' AND produto_id IS NOT NULL AND servico_id IS NULL AND usa_medicao_area = FALSE)
    )
);

-- 3.8. AREA
CREATE TABLE area (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_orcamento_id UUID NOT NULL REFERENCES item_orcamento(id) ON DELETE CASCADE,
    nome VARCHAR(150),
    geometria GEOMETRY(POLYGON, 4326) NOT NULL,
    area_calculada NUMERIC(12,2) NOT NULL,
    unidade VARCHAR(30) NOT NULL DEFAULT 'm²',
    observacoes TEXT,
    CONSTRAINT area_area_calculada_check CHECK (area_calculada > 0),
    CONSTRAINT area_geometria_nao_vazia_check CHECK (NOT ST_IsEmpty(geometria)),
    CONSTRAINT area_geometria_valida_check CHECK (ST_IsValid(geometria))
);

-- ============================================================================
-- 4. ÍNDICES
-- ============================================================================

-- Índices relacionais e de consulta (Modelo Físico v1.1 - Seção 19)
CREATE INDEX idx_cliente_usuario_id ON cliente(usuario_id);
CREATE INDEX idx_servico_usuario_id ON servico(usuario_id);
CREATE INDEX idx_produto_usuario_id ON produto(usuario_id);
CREATE INDEX idx_orcamento_usuario_id ON orcamento(usuario_id);
CREATE INDEX idx_orcamento_cliente_id ON orcamento(cliente_id);
CREATE INDEX idx_orcamento_status ON orcamento(status);
CREATE INDEX idx_item_orcamento_orcamento_id ON item_orcamento(orcamento_id);
CREATE INDEX idx_item_orcamento_servico_id ON item_orcamento(servico_id);
CREATE INDEX idx_item_orcamento_produto_id ON item_orcamento(produto_id);
CREATE INDEX idx_area_item_orcamento_id ON area(item_orcamento_id);

-- Índice espacial PostGIS (Modelo Físico v1.1 - Seção 19)
CREATE INDEX idx_area_geometria ON area USING GIST (geometria);
