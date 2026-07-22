import '@shopify/shopify-api/adapters/node';
import { ApiVersion } from '@shopify/shopify-api';
import { createAdminApiClient } from '@shopify/admin-api-client';
import { getShopifyAccessToken } from './oauth';

export const METAOBJECT_TYPE = process.env.SHOPIFY_METAOBJECT_TYPE || 'rendez_vous_fred';

let clientInstance: ReturnType<typeof createAdminApiClient> | null = null;
let cachedShop: string | null = null;
let cachedToken: string | null = null;

function getShopifyClient() {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  if (!storeDomain) {
    throw new Error('Missing SHOPIFY_STORE_DOMAIN');
  }

  const accessToken = getShopifyAccessToken(storeDomain);
  const apiVersion = process.env.SHOPIFY_API_VERSION || ApiVersion.October24;

  // Recreate the client if the shop or token changed (e.g. after OAuth callback)
  if (clientInstance && cachedShop === storeDomain && cachedToken === accessToken) {
    return clientInstance;
  }

  clientInstance = createAdminApiClient({
    storeDomain,
    apiVersion,
    accessToken,
    customFetchApi: fetch,
  });

  cachedShop = storeDomain;
  cachedToken = accessToken;
  return clientInstance;
}

export interface Reservation {
  id: string;
  handle: string;
  nom: string;
  prenom: string;
  societe: string;
  email: string;
  telephone: string;
  date: string;
  heure: string;
  produit: string;
  message: string;
  statut: string;
  token: string;
  createdAt: string;
}

const FIELD_MAP = [
  { internal: 'nom' as const, display: 'Nom' },
  { internal: 'prenom' as const, display: 'Prénom' },
  { internal: 'societe' as const, display: 'Société' },
  { internal: 'email' as const, display: 'Adresse e-mail' },
  { internal: 'telephone' as const, display: 'Téléphone' },
  { internal: 'date' as const, display: 'Date du rendez-vous' },
  { internal: 'heure' as const, display: 'Heure du rendez-vous' },
  { internal: 'produit' as const, display: 'Produit concerné' },
  { internal: 'message' as const, display: 'Message' },
  { internal: 'statut' as const, display: 'Statut' },
  { internal: 'token' as const, display: 'Token' },
  { internal: 'createdAt' as const, display: 'Créé le' },
];

let fieldKeysCache: Record<string, string> | null = null;

export async function loadFieldKeys(): Promise<Record<string, string>> {
  if (fieldKeysCache) return fieldKeysCache;

  const query = `
    query getMetaobjectDefinitions {
      metaobjectDefinitions(first: 250) {
        nodes {
          type
          fieldDefinitions {
            key
            name
          }
        }
      }
    }
  `;

  const { data, errors } = await getShopifyClient().request<any>(query);
  if (errors) {
    const message = Array.isArray(errors)
      ? errors.map((e: any) => e.message).join(', ')
      : errors.message || JSON.stringify(errors);
    throw new Error(`Shopify definition query error: ${message}`);
  }

  const definitions = data?.metaobjectDefinitions?.nodes as
    | { type: string; fieldDefinitions: { key: string; name: string }[] }[]
    | undefined;
  const definition = definitions?.find((node) => node.type === METAOBJECT_TYPE);

  if (!definition) {
    throw new Error(`Metaobject type "${METAOBJECT_TYPE}" not found. Check SHOPIFY_METAOBJECT_TYPE.`);
  }

  const map: Record<string, string> = {};
  for (const field of definition.fieldDefinitions) {
    map[field.name] = field.key;
  }

  fieldKeysCache = map;
  return map;
}

export async function getShopifyFieldKey(displayName: string): Promise<string> {
  const keys = await loadFieldKeys();
  const key = keys[displayName];
  if (!key) {
    throw new Error(`Shopify field "${displayName}" not found in metaobject "${METAOBJECT_TYPE}"`);
  }
  return key;
}

export async function createReservationMetaobject(
  input: Omit<Reservation, 'id' | 'handle'>
): Promise<Reservation> {
  const keys = await loadFieldKeys();

  const fields = FIELD_MAP.map(({ internal, display }) => {
    const key = keys[display];
    if (!key) {
      throw new Error(`Missing Shopify field key for "${display}"`);
    }
    const value = (input as any)[internal];
    return {
      key,
      value: value === undefined || value === null ? '' : String(value),
    };
  });

  const mutation = `
    mutation metaobjectCreate($metaobject: MetaobjectCreateInput!) {
      metaobjectCreate(metaobject: $metaobject) {
        metaobject {
          id
          handle
          fields {
            key
            value
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    metaobject: {
      type: METAOBJECT_TYPE,
      handle: input.token,
      fields,
    },
  };

  const { data, errors } = await getShopifyClient().request<any>(mutation, { variables });
  if (errors) {
    const message = Array.isArray(errors)
      ? errors.map((e: any) => e.message).join(', ')
      : errors.message || JSON.stringify(errors);
    throw new Error(`Shopify create error: ${message}`);
  }

  const result = data?.metaobjectCreate;
  if (result?.userErrors?.length) {
    throw new Error(result.userErrors.map((e: any) => `${e.field}: ${e.message}`).join('; '));
  }

  if (!result?.metaobject) {
    throw new Error('No metaobject returned by Shopify');
  }

  return normalizeMetaobject(result.metaobject);
}

export async function getReservationByToken(token: string): Promise<Reservation | null> {
  await loadFieldKeys();

  const query = `
    query getMetaobjectByHandle($type: String!, $handle: String!) {
      metaobjectByHandle(handle: { type: $type, handle: $handle }) {
        id
        handle
        fields {
          key
          value
        }
      }
    }
  `;

  const variables = { type: METAOBJECT_TYPE, handle: token };
  const { data, errors } = await getShopifyClient().request<any>(query, { variables });
  if (errors) {
    const message = Array.isArray(errors)
      ? errors.map((e: any) => e.message).join(', ')
      : errors.message || JSON.stringify(errors);
    throw new Error(`Shopify query error: ${message}`);
  }

  const metaobject = data?.metaobjectByHandle;
  if (!metaobject) return null;

  return normalizeMetaobject(metaobject);
}

export async function updateReservationStatus(
  id: string,
  status: 'Confirmé' | 'Annulé'
): Promise<void> {
  const statutKey = await getShopifyFieldKey('Statut');

  const mutation = `
    mutation metaobjectUpdate($id: ID!, $metaobject: MetaobjectUpdateInput!) {
      metaobjectUpdate(id: $id, metaobject: $metaobject) {
        metaobject {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    id,
    metaobject: {
      fields: [{ key: statutKey, value: status }],
    },
  };

  const { data, errors } = await getShopifyClient().request<any>(mutation, { variables });
  if (errors) {
    const message = Array.isArray(errors)
      ? errors.map((e: any) => e.message).join(', ')
      : errors.message || JSON.stringify(errors);
    throw new Error(`Shopify update error: ${message}`);
  }

  const result = data?.metaobjectUpdate;
  if (result?.userErrors?.length) {
    throw new Error(result.userErrors.map((e: any) => `${e.field}: ${e.message}`).join('; '));
  }
}

function normalizeMetaobject(metaobject: {
  id: string;
  handle: string;
  fields: { key: string; value?: string | null }[];
}): Reservation {
  const raw: Record<string, string> = {};
  for (const field of metaobject.fields) {
    if (field.value !== null && field.value !== undefined) {
      raw[field.key] = field.value;
    }
  }

  const keys = fieldKeysCache ?? {};
  const result: any = {};

  for (const { internal, display } of FIELD_MAP) {
    const shopifyKey = keys[display];
    result[internal] = shopifyKey ? raw[shopifyKey] ?? '' : '';
  }

  result.id = metaobject.id;
  result.handle = metaobject.handle;

  return result as Reservation;
}
