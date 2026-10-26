# Uniruy Wyden - Programação para Dispositivos Móveis em Android 

Professor: Vagner Oliveira
- Luan Masao
- Aila Stefani

# Sistema de Orçamentos para Jardinagem

Aplicativo Android desenvolvido como projeto acadêmico para auxiliar profissionais de jardinagem na criação e gerenciamento de orçamentos.

O sistema permite cadastrar clientes, serviços e produtos, criar e reutilizar orçamentos, aplicar descontos e gerar propostas em PDF. Seu principal diferencial é a utilização de mapas em modo satélite para delimitar áreas de trabalho por polígonos, calcular automaticamente sua área em m² e utilizar essa medição na composição do orçamento.

## Status

✅ Versão 1.0 da aplicação completa

✅ Versão 1.0 da documentação completa 

## Stack 

- React Native
- Expo
- TypeScript
- Supabase / PostgreSQL
- Google Maps
- PostGIS

## Objetivo acadêmico

O projeto busca aplicar conceitos de Engenharia de Software, requisitos, modelagem UML, banco de dados, arquitetura de software e desenvolvimento mobile em uma solução prática para o setor de jardinagem.

## Utilização de API

Para que as imagens de satélite renderizem, é necessário cadastrar uma chave **API Google Maps**. Acesse o arquivo .env.example para acessar o modelo **.env**, que deve ser criado para criar sincronizar sua **API Maps** com o projeto. 
 
 Para gerar a API, Clique em **"Create your account"**:
https://mapsplatform.google.com/lp/maps-apis/

## Comandos apara iniciar

- Instalar dependências: **npm install**
- Iniciar servidor de desenvolvimento (Metro Bundler): **npm start** ou **npm expo start**

# Atenção!
Para que a **aplicação** funcione corretamente com a **API**, é necessário gerar a **Development Build**. Com o seu **celular** conectado via **USB** (Com depuração ativada) ou emulador **Android Studio**: 
utilize **npx expo run: android** ou **npm run android**
