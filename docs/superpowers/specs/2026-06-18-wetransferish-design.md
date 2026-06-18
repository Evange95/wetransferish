# Wetransferish — Design Spec

MVP clone di WeTransfer per colloquio tecnico. Focus sulla profondità tecnica: streaming efficiente in Node.js, architettura esagonale, clean architecture React, TDD rigoroso, parse don't validate ovunque.

## Decisioni prese

| Scelta | Decisione |
|--------|-----------|
| Storage file | MinIO (S3-compatibile) in Docker |
| Autenticazione | Nessuna — flusso anonimo |
| Database | PostgreSQL |
| Upload strategy | Streaming multipart chunked, zero buffering in memoria |
| Download multi-file | ZIP on-the-fly in streaming |
| Scadenza trasferimenti | Soft-delete (link rifiutato dopo scadenza, file non cancellati) |
| Framework HTTP | Fastify |
| Frontend | React 19 + React Compiler + Vite |
| UI | Funzionale e pulita, non curata graficamente |
| Reverse proxy | nginx (serve frontend statico + proxy API) |

## Struttura monorepo

```
wetransferish/
├── packages/
│   ├── backend/          # Fastify + Hexagonal Architecture
│   │   └── Dockerfile
│   ├── frontend/         # React 19 + Clean Architecture
│   │   └── Dockerfile    # Multi-stage: build con Vite → bundle statico
│   └── shared/           # Tipi condivisi (DTOs, value objects, Result type)
├── nginx/
│   └── nginx.conf
├── docker-compose.yml    # nginx + backend + postgres + minio
├── package.json          # pnpm workspaces root
└── tsconfig.base.json
```

4 container in Docker Compose:
- **nginx** — entry point porta 80. `/api/*` → backend, resto → file statici frontend
- **backend** — Fastify, solo API
- **postgres** — metadati trasferimenti
- **minio** — object storage file

Il frontend Dockerfile è multi-stage: primo stage builda con Vite, il bundle risultante viene montato come volume in nginx.

## Domain Model

Linguaggio di dominio: il sistema parla di "trasferimenti" e "allegati", non di "upload" e "blob".

### Aggregate Root: Transfer

Un trasferimento è l'atto di condividere uno o più file. Ciclo di vita:

```
collecting → ready → expired
```

- **`Transfer`** — il trasferimento nel suo insieme. Contiene uno o più allegati, ha un link di condivisione e una data di scadenza.
- **`Attachment`** — entity, un singolo file dentro un trasferimento. Ha un nome, una dimensione e un riferimento a dove è conservato.

### Value Objects (immutabili, identità data dal valore)

- **`ShareLink`** — link univoco, non indovinabile (nanoid). Il tipo garantisce che il formato è valido.
- **`Expiry`** — data di scadenza. Sa rispondere a "è ancora valido?".
- **`FileSize`** — dimensione di un file. Non negativa, sotto il limite massimo configurato.
- **`FileName`** — nome originale del file. Sanitizza caratteri pericolosi al momento del parsing.
- **`StorageKey`** — percorso nello storage. Il dominio non sa che è MinIO.

### Invarianti enforce dal Transfer

- Non puoi aggiungere allegati a un trasferimento `ready` o `expired`
- Non puoi scaricare un trasferimento `collecting`
- Non puoi superare il limite massimo di dimensione totale
- Un trasferimento deve avere almeno un allegato per essere finalizzato

### Parse don't validate

Principio guida su tutti i livelli. I value object non "validano" — **parsano**. Costruttore privato, unico punto di ingresso è un factory method statico che restituisce `Result<T, E>`.

Se hai un `FileSize` in mano, sai che è valido. Il tipo lo garantisce. Non serve ricontrollare mai.

Applicazione:
- **Domain**: `ShareLink.create(raw)` → `Result<ShareLink, InvalidShareLink>`
- **Adapter HTTP (ingresso)**: le route parsano body/params in value object al confine. Parsing fallito → 400. Parsing riuscito → da lì in poi il tipo porta la garanzia.
- **Adapter Postgres (uscita)**: ricostruire un Transfer dal DB passa dai factory method. DB corrotto → errore al momento della lettura.
- **Frontend**: `HttpTransferGateway` parsa risposte JSON in domain model tipizzati al confine.

**Nessun tipo primitivo vola libero**: le funzioni non accettano `string` dove serve un `ShareLink`, non accettano `number` dove serve un `FileSize`.

**`Result<T, E>`**: tipo leggero in `shared`. Niente eccezioni per logica di dominio — il chiamante è obbligato a gestire il caso di errore dal tipo.

## Backend — Architettura Esagonale

```
packages/backend/src/
├── domain/
│   ├── model/
│   │   ├── Transfer.ts        # Aggregate root
│   │   ├── Attachment.ts      # Entity
│   │   ├── ShareLink.ts       # Value Object
│   │   ├── Expiry.ts          # Value Object
│   │   ├── FileSize.ts        # Value Object
│   │   ├── FileName.ts        # Value Object
│   │   └── StorageKey.ts      # Value Object
│   └── port/
│       ├── TransferRepository.ts    # Persistenza trasferimenti
│       ├── FileStorage.ts           # Conservare/recuperare file (stream)
│       └── IdGenerator.ts           # Generare identificativi univoci
│
├── application/
│   ├── CreateTransfer.ts      # Crea un nuovo trasferimento
│   ├── UploadAttachment.ts    # Aggiunge un file (streaming)
│   ├── FinalizeTransfer.ts    # Segna come pronto
│   ├── DownloadTransfer.ts    # ZIP streaming di tutti i file
│   ├── DownloadAttachment.ts  # Download singolo file
│   └── GetTransferInfo.ts     # Info per la pagina download
│
├── infrastructure/
│   ├── persistence/
│   │   └── PostgresTransferRepository.ts
│   ├── storage/
│   │   └── MinioFileStorage.ts
│   ├── id/
│   │   └── NanoIdGenerator.ts
│   └── http/
│       ├── FastifyServer.ts
│       └── routes/
│           ├── uploadRoutes.ts
│           └── downloadRoutes.ts
│
└── config/
    └── container.ts           # Wiring dipendenze
```

### Regola fondamentale

Le dipendenze puntano sempre verso l'interno. Il domain non importa nulla da infrastructure. I use case dipendono solo dal domain. L'infrastructure implementa i port.

### Port

- **`TransferRepository`** — CRUD trasferimenti. Interfaccia nel domain, implementata da Postgres.
- **`FileStorage`** — store/retrieve stream di byte. Metodi accettano e restituiscono `ReadableStream`. Interfaccia nel domain, implementata da MinIO.
- **`IdGenerator`** — genera ShareLink e ID. Estratto come port per test deterministici.

### Flusso Upload

1. `CreateTransfer` → crea aggregate con stato `collecting`, restituisce `transferId` e `shareLink`
2. Per ogni file: `UploadAttachment` → riceve stream, lo passa a `FileStorage.store()`, aggiunge `Attachment` al `Transfer`
3. `FinalizeTransfer` → transizione a `ready`, link attivo

### Flusso Download

1. `GetTransferInfo` → verifica esistenza e non scaduto
2. `DownloadTransfer` → per ogni attachment apre stream da `FileStorage`, compone ZIP on-the-fly, restituisce stream composito
3. Oppure `DownloadAttachment` → stream singolo diretto

### Streaming e efficienza

- Upload: il body multipart viene consumato come stream Node.js, pipe diretto a MinIO. Il server non accumula mai il file intero in memoria. Backpressure gestita nativamente da pipe/pipeline.
- Download ZIP: libreria di compressione ZIP streaming (archiver o simile) che accetta stream in input e produce stream in output. Nessun file temporaneo su disco.
- Download singolo: pipe diretto da MinIO stream → response stream.

## Frontend — Clean Architecture React 19

```
packages/frontend/src/
├── domain/
│   ├── model/
│   │   ├── Transfer.ts        # Stato trasferimento lato client
│   │   ├── Attachment.ts      # File in upload/scaricabile
│   │   └── UploadProgress.ts  # Progresso upload
│   └── port/
│       └── TransferGateway.ts # Comunicazione col backend
│
├── application/
│   ├── SendTransfer.ts        # Orchestrazione upload multi-file
│   └── FetchTransferInfo.ts   # Recupera info pagina download
│
├── infrastructure/
│   └── api/
│       └── HttpTransferGateway.ts  # Implementa TransferGateway via fetch
│
├── ui/
│   ├── pages/
│   │   ├── UploadPage.tsx     # Pagina principale con drop zone
│   │   └── DownloadPage.tsx   # Pagina download da ShareLink
│   ├── components/
│   │   ├── DropZone.tsx       # Drag-and-drop area
│   │   ├── FileList.tsx       # Lista file selezionati
│   │   ├── ProgressBar.tsx    # Barra progresso upload
│   │   └── ShareLinkCard.tsx  # Link generato copiabile
│   └── hooks/
│       ├── useUpload.ts       # Use case → stato React
│       └── useTransferInfo.ts # Fetch info → stato React
│
└── config/
    └── container.ts
```

### React 19 + React Compiler

Il React Compiler auto-memoizza componenti e valori derivati. Zero `useMemo`, `useCallback`, `React.memo` manuali. Il codice resta pulito, la performance è garantita dal compilatore. Integrato in Vite come plugin Babel.

### Ottimizzazioni performance

- `useTransition` nella `DropZone` per mantenere la UI responsive con molti file
- Upload paralleli con concurrency limitata (3 file alla volta) — orchestrato dallo use case `SendTransfer`, non dalla UI
- Layout stabile in `FileList` per evitare reflow durante aggiornamento progressi
- Le `ProgressBar` aggiornano solo stato locale del singolo file — il compiler ottimizza automaticamente ma la struttura dati lo facilita

### Stack

- React 19
- React Compiler (plugin Vite/Babel)
- Vite bundler
- React Router — due route: `/` (upload), `/d/:shareLink` (download)

### Flusso UI Upload

1. Drag file nella `DropZone`
2. `useUpload` invoca `SendTransfer` (use case)
3. `SendTransfer` → `TransferGateway.createTransfer()` → per ogni file `uploadFile(onProgress)` → `finalizeTransfer()`
4. `ProgressBar` si aggiorna via stato React
5. Completamento → `ShareLinkCard` con link copiabile

### Flusso UI Download

1. Utente apre `/d/:shareLink`
2. `useTransferInfo` → `FetchTransferInfo` → mostra nome, dimensione, numero file, scadenza
3. Click "Scarica" → download diretto via browser (backend risponde con ZIP stream)

## API REST

```
POST   /api/transfers
  → Crea un nuovo trasferimento
  ← 201 { transferId, shareLink }

POST   /api/transfers/:transferId/attachments
  → Upload singolo file (multipart/form-data, streaming)
  ← 201 { attachmentId, fileName, fileSize }

POST   /api/transfers/:transferId/finalize
  → Segna trasferimento come pronto
  ← 200 { shareLink, expiresAt }

GET    /api/transfers/:shareLink
  → Info pubbliche trasferimento (pagina download)
  ← 200 { fileName, totalSize, attachments[], expiresAt, expired }

GET    /api/transfers/:shareLink/download
  → Scarica tutti i file come ZIP (streaming)
  ← 200 application/zip (Transfer-Encoding: chunked)

GET    /api/transfers/:shareLink/attachments/:attachmentId/download
  → Scarica singolo file (streaming)
  ← 200 application/octet-stream
```

Ogni risposta JSON parsata dai value object del frontend al confine. Ogni body in ingresso parsato dai value object del backend al confine.

**Due identificatori distinti**: `transferId` è l'ID interno usato durante l'upload (il mittente lo conosce). `shareLink` è l'identificativo pubblico usato per il download (il destinatario lo riceve). Le route di upload usano `transferId`, le route di download usano `shareLink`. Non sono intercambiabili.

## Testing Strategy

### Backend — tre livelli

**Unit test domain**: invarianti del Transfer e value object in isolamento. Nessun mock. Es: "non puoi aggiungere attachment a transfer expired", "FileSize rifiuta valori negativi", "Expiry.isExpired() dopo la scadenza".

**Unit test use case**: ogni use case con port fake in-memory (`Map`-based `TransferRepository` e `FileStorage`). Testano orchestrazione: "UploadAttachment salva in storage e aggiunge attachment al transfer".

**Integration test adapter**: `PostgresTransferRepository` con Postgres reale via Testcontainers. `MinioFileStorage` con MinIO reale via Testcontainers. Verificano serializzazione e streaming reale.

**E2E route**: Fastify `inject()` senza avviare il server. Flusso completo upload → finalize → download.

### Frontend — due livelli

**Unit test domain/application**: use case con `TransferGateway` fake. Pura logica, nessun React.

**Component test**: Vitest + Testing Library. Comportamento, non implementazione. Drag simula file → appare in lista. Progresso aggiorna barra.

### Framework

Vitest per tutto (backend e frontend). Stessa toolchain, compatibile con Vite, esecuzione parallela.

### TDD

Red → Green → Refactor su ogni unità, partendo dal domain verso l'esterno (inside-out).
