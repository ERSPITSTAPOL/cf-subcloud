import { backimg, subapi, beiantext, beiandizi } from './index.js';

function makeAccessors(request, env, isNode) {
    const url = isNode
        ? new URL(request.url, `http://${request.headers.host}`)
        : new URL(request.url);

    const getHeader = (key) =>
        isNode ? request.headers[key.toLowerCase()] : request.headers.get(key);

    const getParam    = (key) => url.searchParams.get(key);
    const getParamAll = (key) => url.searchParams.getAll(key);
    const getParamBool = (key) => getParam(key) === 'true';

    const getEnv = (key, fallback) =>
        isNode ? (process.env[key] ?? fallback) : (env?.[key] ?? fallback);

    return { url, getHeader, getParam, getParamAll, getParamBool, getEnv };
}

function resolveTarget(getParam) {
    return getParam('target') || null;
}

const TARGET_UA_MAP = {
    mihomo:  'ClashMetaForAndroid',
    singbox: 'sing-box',
    v2ray:   'v2rayNG',
};

function resolveUserAgent(rawUA, target) {
    const isClientUA = /clash|meta|mihomo|sing|ray/i.test(rawUA ?? '');
    if (isClientUA) return rawUA;
    return TARGET_UA_MAP[target] ?? rawUA;
}

function resolveSingboxVersion(getParamBool) {
    const box114 = getParamBool('box1.14');
    const box113 = !box114 && getParamBool('box1.13');
    return { box114, box113 };
}

function resolveUrls(getParamAll) {
    return getParamAll('url')
        .flatMap((u) => (u.includes(',') ? u.split(',') : u))
        .map((u) => u.trim())
        .filter(Boolean);
}

function resolveEnvValues(getEnv) {
    return {
        IMG:      getEnv('IMG',     backimg),
        sub:      getEnv('SUB',     subapi),
        beian:    getEnv('BEIAN',   beiantext),
        beianurl: getEnv('BEIANURL', beiandizi),
    };
}

function resolveRuleUrl(url, target, getParam, isNode) {
  const template = getParam('template') ?? '';

  try {
    const decoded = decodeURIComponent(template);
    const parsed = new URL(decoded);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return { url: decoded, external: true };
    }
  } catch {}

  const formattedTemplate = template.startsWith('/') ? template.slice(1) : template;

  let basePath;
  if (target) {
    basePath = isNode ? `template/${target}` : target;
  } else {
    basePath = isNode ? 'template' : '';
  }

  const resolved = formattedTemplate
    ? (basePath ? `${url.origin}/${basePath}/${formattedTemplate}` : `${url.origin}/${formattedTemplate}`)
    : (basePath ? `${url.origin}/${basePath}` : `${url.origin}`);

  return { url: resolved, external: false };
}

export function buildConfig(request, env, isNode = false) {
    const { url, getHeader, getParam, getParamAll, getParamBool, getEnv } =
        makeAccessors(request, env, isNode);

    const target    = resolveTarget(getParam);
    const rawUA     = getHeader('User-Agent') || '';
    const userAgent = resolveUserAgent(rawUA, target);

    return {
        url,
        urls:            resolveUrls(getParamAll),
        userAgent,
        target,

        udp:             getParamBool('udp'),
        udp_fragment:    getParamBool('udp_frag'),
        tls_fragment:    getParamBool('tls_frag'),
        ech:             getParamBool('ech'),
        yaml:            getParamBool('yaml'),

        tun:             getParamBool('tun'),
        exclude_package: getParamBool('ep'),
        exclude_address: getParamBool('ea'),
        tailscale:       getParamBool('tailscale'),

        ...resolveSingboxVersion(getParamBool),

        ...resolveEnvValues(getEnv),

        rule: resolveRuleUrl(url, target, getParam, isNode),
        assets: env?.ASSETS ?? null,
    };
}