# Platform services for remote apps

A remote app has its own BFF. The platform does not proxy MQTT, MySQL or search for it: the BFF reads the address
and credentials from its environment and talks to the service itself, with a client (for Meilisearch `SearchService` in `uxp-bff-common`).

| Service     | Environment                                                                  | Helper                         |
| ----------- | ---------------------------------------------------------------------------- | ------------------------------ |
| MQTT        | `UHN_MQTT_BROKER_URL` (UHN)                                                  | the app's own client           |
| MySQL       | `DATABASE_HOST`, `DATABASE_PORT`, `MYSQL_<APP>_DATABASE/_USER/_PASSWORD`     | TypeORM helpers in `uxp-bff-common` |
| Meilisearch | `MEILI_URL`, `MEILI_API_KEY`                                                 | `SearchService` in `uxp-bff-common` |

A service whose variables are unset is off, and the app has to work without it.

## Meilisearch

Meilisearch is a shared server with one master key. The master key is for administration only.

- **Index names** are `<app>_<kind>` (`aud_tracks`). An app only works on its own prefix.
- **Scoped key:** each app gets an API key limited to its prefix and to the actions it needs. The key is made
  with the master key (`SearchService.ensureScopedKey`, or a call to `POST /keys` in the deployment) and only
  the scoped key goes to the app's environment. In development the BFF may hold the master key and make its key
  at start.
- A key's actions cannot be changed: delete the key and make it again.
- **Data is rebuildable:** an app indexes from its own source of truth at start and on change, so the volume
  needs no backup.
- `SearchService` is generic: `ensureIndex` (settings, synonyms, stop words), `replaceDocuments`,
  `multiSearch`, `federatedSearch`, `health`. Failures of Meilisearch are returned or thrown, not hidden: the
  app decides what "search unavailable" means. It does not report to the platform health (see
  [Notification and platform health](./notification-and-health.md)).

The first user is AUD, see `docs/aud/search.md`.
