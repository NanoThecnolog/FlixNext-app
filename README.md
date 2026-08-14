# FlixNext Android

Aplicativo móvel da FlixNext em React Native, Expo e TypeScript. O Next.js funciona
como BFF (backend for frontend): o app conversa apenas com `EXPO_PUBLIC_FRONTEND_URL`
e nunca recebe URLs ou chaves dos serviços internos.

## Executar

```bash
cp .env.example .env
npm install
npm run typecheck
npm start
```

Para executar um build nativo local:

```bash
npm run android
```

## Arquitetura

```text
src/
├── api/          clientes HTTP do BFF
├── config/       configuração central do app
├── contexts/     estado compartilhado de sessão, catálogo e lista
├── domain/       contratos MongoDB, TMDB, usuário e reprodução
├── hooks/        carregamento de dados ligado ao ciclo da UI
├── mappers/      composição explícita MongoDB + TMDB
├── navigation/   rotas e parâmetros tipados
├── screens/      telas
├── services/     regras e casos de uso
├── storage/      SecureStore e cache persistente
└── utils/        seletores puros de apresentação
```

Cada item do catálogo mantém duas fontes separadas:

- `item.mongo`: disponibilidade, classificação, idioma, índices e URLs para assistir;
- `item.tmdb`: título editorial, sinopse, pôster, backdrop, gêneros e avaliação.

O vínculo é `MongoMovie.tmdbId === TmdbMovie.id` para filmes e
`MongoSeries.tmdbID === TmdbSeries.id` para séries.

O catálogo é carregado uma vez pelo `CatalogProvider`, mantido em memória e salvo no
AsyncStorage por 15 minutos. Detalhes, créditos e temporadas usam caches separados;
temporadas são carregadas apenas quando abertas.

## Configuração visual e builds

Consulte [docs/APP_CONFIGURATION.md](docs/APP_CONFIGURATION.md).
