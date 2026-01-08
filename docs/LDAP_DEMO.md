# LDAP Demo (Local)

Spin up a disposable LDAP + phpLDAPadmin pair for testing:

```bash
docker compose -f docker-compose.ldap.yml up -d
```

- LDAP: `ldap://localhost:1389` (LDAPS self-signed: `ldaps://localhost:1636`)
- Base DN: `dc=example,dc=com`
- Bind DN: `cn=admin,dc=example,dc=com`
- Bind password: `admin`
- Users: `adminuser` / `AdminPass123!`, `analystuser` / `AnalystPass123!`, `guarduser` / `GuardPass123!`
- phpLDAPadmin: http://localhost:8081 (login with admin DN/pw)

Optional groups to map roles:
- Admins: `cn=admins,ou=groups,dc=example,dc=com`
- Analysts: `cn=analysts,ou=groups,dc=example,dc=com`
- Guards: `cn=guards,ou=groups,dc=example,dc=com`

Backend env (example):
```
LDAP_ENABLED=true
LDAP_URL=ldap://localhost:1389
LDAP_BASE_DN=dc=example,dc=com
LDAP_BIND_DN=cn=admin,dc=example,dc=com
LDAP_BIND_PASSWORD=admin
LDAP_LOGIN_ATTRIBUTE=uid
LDAP_START_TLS=false
LDAP_TLS_REJECT_UNAUTHORIZED=false
LDAP_ADMIN_GROUP_DN=cn=admins,ou=groups,dc=example,dc=com
LDAP_ANALYST_GROUP_DN=cn=analysts,ou=groups,dc=example,dc=com
LDAP_GUARD_GROUP_DN=cn=guards,ou=groups,dc=example,dc=com
LDAP_DEFAULT_ROLE=GUARD
```

Frontend env (to show LDAP login toggle):
```
VITE_ENABLE_LDAP_LOGIN=true
```
