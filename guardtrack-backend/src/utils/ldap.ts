import ldap from 'ldapjs';
import crypto from 'crypto';

export interface LdapUser {
  dn: string;
  username: string;
  email: string;
  name: string;
  memberOf: string[];
}

const getEnvBoolean = (value: string | undefined, defaultValue: boolean) => {
  if (value === undefined) return defaultValue;
  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
};

export const isLdapEnabled = () => getEnvBoolean(process.env.LDAP_ENABLED, false);

const escapeLdapFilter = (value: string) =>
  value.replace(/[*()\\]/g, (char) => `\\${char.charCodeAt(0).toString(16)}`);

export async function ldapAuthenticate(username: string, password: string): Promise<LdapUser> {
  if (!isLdapEnabled()) {
    throw new Error('LDAP is not enabled');
  }

  const url = process.env.LDAP_URL;
  const baseDN = process.env.LDAP_BASE_DN;
  const bindDN = process.env.LDAP_BIND_DN;
  const bindPassword = process.env.LDAP_BIND_PASSWORD;
  const loginAttr = process.env.LDAP_LOGIN_ATTRIBUTE || 'uid';
  const startTLS = getEnvBoolean(process.env.LDAP_START_TLS, false);
  const rejectUnauthorized = getEnvBoolean(process.env.LDAP_TLS_REJECT_UNAUTHORIZED, true);

  if (!url || !baseDN) {
    throw new Error('LDAP_URL and LDAP_BASE_DN are required when LDAP is enabled');
  }

  const client = ldap.createClient({
    url,
    tlsOptions: { rejectUnauthorized },
  });

  const unbindClient = () =>
    new Promise<void>((resolve) => {
      client.unbind(() => resolve());
    });

  try {
    if (startTLS) {
      await new Promise<void>((resolve, reject) => {
        client.starttls({}, [], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // Service bind
    if (bindDN && bindPassword) {
      await new Promise<void>((resolve, reject) => {
        client.bind(bindDN, bindPassword, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // Search for user DN
    const searchFilter = `(${loginAttr}=${escapeLdapFilter(username)})`;
    const userEntry = await new Promise<any>((resolve, reject) => {
      let found = false;
      client.search(
        baseDN,
        {
          scope: 'sub',
          filter: searchFilter,
          attributes: ['dn', 'cn', 'mail', 'displayName', 'memberOf', loginAttr],
        },
        (err, res) => {
          if (err) return reject(err);
          res.on('searchEntry', (entry) => {
            if (!found) {
              found = true;
              resolve(entry);
            }
          });
          res.on('error', (error) => reject(error));
          res.on('end', () => {
            if (!found) reject(new Error('User not found in LDAP'));
          });
        }
      );
    });

    const userDN: string = userEntry?.dn || userEntry?.objectName;
    if (!userDN) {
      throw new Error('User DN not found');
    }

    // Verify password by binding as the user
    await new Promise<void>((resolve, reject) => {
      client.bind(userDN, password, (err) => {
        if (err) reject(new Error('Invalid LDAP credentials'));
        else resolve();
      });
    });

    const attrs = userEntry.attributes?.reduce((acc: any, attr: any) => {
      acc[attr.type] = attr.vals || attr.value || attr.values || [];
      return acc;
    }, {}) || userEntry.object;

    const memberOfRaw = attrs.memberOf || [];
    const memberOf = Array.isArray(memberOfRaw) ? memberOfRaw : [memberOfRaw].filter(Boolean);

    const email = (() => {
      const mail = Array.isArray(attrs.mail) ? attrs.mail[0] : attrs.mail;
      if (mail) return mail;
      return `${username}@ldap.local`;
    })();

    const name =
      (Array.isArray(attrs.displayName) ? attrs.displayName[0] : attrs.displayName) ||
      (Array.isArray(attrs.cn) ? attrs.cn[0] : attrs.cn) ||
      username;

    return {
      dn: userDN,
      username,
      email,
      name,
      memberOf,
    };
  } finally {
    await unbindClient();
  }
}

export const generateRandomPassword = () =>
  crypto.randomBytes(16).toString('hex');
