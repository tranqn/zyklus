# Was hier liegt

Kopien dessen, was auf dem Hetzner-Server installiert ist. Die Dateien auf dem
Server sind die gültigen; diese hier sind dazu da, dass man nachlesen kann, wie
die Kiste eingerichtet ist, ohne sich einzuloggen.

| Datei | Auf dem Server | Gehört |
| --- | --- | --- |
| `Caddyfile.snippet` | Block in `/etc/caddy/Caddyfile` | `root` |
| `zyklus.conf` | `/opt/ci/projects/zyklus.conf` | `root` |
| `zyklus-api.conf` | `/opt/ci/projects/zyklus-api.conf` | `root` |
| `host/github-pull` | `/opt/ci/bin/github-pull` | `root` |
| `host/github-pull@.service` | `/etc/systemd/system/` | `root` |
| `host/github-pull@.timer` | `/etc/systemd/system/` | `root` |

Nicht hier, und nirgends im Repo: `server/.env` (SMTP-Passwort) und
`server/compose.hetzner.yml`. Die liegen nur auf dem Server, mode 640, und
`compose.hetzner.example.yml` zeigt, was drinsteht.

## Wie ein Deploy ausgelöst wird

Nicht von GitHub. `github-pull` läuft als Timer auf dem Server, alle fünf
Minuten, als Benutzer `ci`, und fragt nach:

- **`zyklus`** (`KIND=static`) holt den Branch `site`, den ein grüner Lauf auf
  `main` geschrieben hat, und veröffentlicht daraus `site/`. Der Rest des
  Checkouts, insbesondere das `.git`, bleibt außen vor.
- **`zyklus-api`** (`KIND=compose`) nimmt den neuesten Lauf auf `main` mit
  `conclusion: success` und `event: push`, der aus diesem Repo und nicht aus
  einem Fork stammt, und lässt `deploy` diesen Commit bauen. Ein Kandidat, der
  den gerade laufenden Commit nicht in seiner Historie hat, wird abgelehnt:
  „neuester grüner Lauf" ist nicht „neuester Commit", und ein Rückschritt soll
  kein Deploy heißen.

`/opt/ci/bin/deploy` ist in beiden Fällen derselbe Weg wie für jedes andere
Projekt auf der Kiste: ein Deploy zur Zeit, Health-Check, Rollback, Logbuch
unter `/opt/ci/log/<projekt>.log`.

## Von Hand deployen

```sh
ssh hetzner
sudo -u ci /opt/ci/bin/github-pull zyklus       # oder zyklus-api
```

Ein Commit, dessen Deploy gescheitert ist, steht in
`/opt/ci/state/<projekt>.tried` und wird nicht wieder versucht. Die Datei
löschen, um es noch einmal zu probieren.
