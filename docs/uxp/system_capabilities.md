
## System capabilities (system-level navigation)

UXP exposes **system capabilities** for remote apps that opt in.
This allows remote apps to participate in **system-level UI surfaces**
such as health views or control panels.

System capabilities are **not routes** and **not page navigation**.

They represent **feature availability** per remote app.

---

### Capability discovery

System capabilities are resolved server-side and exposed as structured metadata.

**Implementation**
- [NavigationService.getSystemCapabilities](https://github.com/fisaks/uxp/blob/main/packages/uxp-bff/src/services/navigation.service.ts)

At runtime:

1. All active apps are loaded
2. Each app is inspected for declared capabilities
3. Apps without system capabilities are excluded
4. The remaining apps are sorted and exposed to the client

Example response:

```json
{
  "system": [
    {
      "appId": "uhn",
      "appName": "UHN",
      "capabilities": {
        "health": true,
        "systemPanel": true
      }
    }
  ]
}
```

---

### Declaring system capabilities

System capabilities are declared via **app configuration**.

An app may expose:
- `health` – participates in system health views
- `systemPanel` – participates in system management UI

Optional configuration:
- `systemSortOrder` – controls ordering in system UIs

Apps that do not declare any system capabilities are ignored.

---

### Design intent

System capabilities intentionally:

- are **independent of routes**
- do **not** affect page composition
- do **not** participate in route tags
- describe **what an app can do**, not *where it is rendered*

This allows UXP to build:
- global system dashboards
- control panels
- health overviews

without coupling them to routing or navigation structure.

---

### Mental model

> **Routes** define user navigation  
> **Tags** organize menus  
> **System capabilities** describe platform-level features

They solve different problems and are resolved independently.