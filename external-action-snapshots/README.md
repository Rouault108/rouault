# External Action Snapshots

This directory records the reviewed source binding for external GitHub Actions used by `.github/workflows/ci-cd.yml`.

| action name | adopted tag | reviewed commit SHA | runs.using | workflow uses SHA |
| --- | --- | --- | --- | --- |
| `actions/checkout` | `v6.0.3` | `df4cb1c069e1874edd31b4311f1884172cec0e10` | `node24` | `df4cb1c069e1874edd31b4311f1884172cec0e10` |
| `actions/setup-node` | `v6.4.0` | `48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e` | `node24` | `48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e` |
| `pnpm/action-setup` | `v6.0.8` | `0e279bb959325dab635dd2c09392533439d90093` | `node24` | `0e279bb959325dab635dd2c09392533439d90093` |
| `actions/upload-artifact` | `v7.0.1` | `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` | `node24` | `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` |
| `actions/download-artifact` | `v8.0.1` | `3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c` | `node24` | `3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c` |

Tag names are review coordinates only. The workflow execution authority is the checked-in 40 character commit SHA.
