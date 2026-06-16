# External Action Snapshots

This directory records the reviewed source binding for external GitHub Actions used by `.github/workflows/ci-cd.yml`.

| action name | adopted tag | reviewed commit SHA | runs.using | workflow uses SHA |
| --- | --- | --- | --- | --- |
| `actions/checkout` | `v5` | `93cb6efe18208431cddfb8368fd83d5badbf9bfd` | `node24` | `93cb6efe18208431cddfb8368fd83d5badbf9bfd` |
| `actions/setup-node` | `v5` | `a0853c24544627f65ddf259abe73b1d18a591444` | `node24` | `a0853c24544627f65ddf259abe73b1d18a591444` |
| `pnpm/action-setup` | `v5` | `a8198c4bff370c8506180b035930dea56dbd5288` | `node24` | `a8198c4bff370c8506180b035930dea56dbd5288` |
| `actions/upload-artifact` | `v6` | `b7c566a772e6b6bfb58ed0dc250532a479d7789f` | `node24` | `b7c566a772e6b6bfb58ed0dc250532a479d7789f` |
| `actions/download-artifact` | `v7` | `37930b1c2abaa49bbe596cd826c3c89aef350131` | `node24` | `37930b1c2abaa49bbe596cd826c3c89aef350131` |

Tag names are review coordinates only. The workflow execution authority is the checked-in 40 character commit SHA.
