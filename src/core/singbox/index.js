import { splitUrlsAndProxies, fetchTemplate, fetchpackExtract, fetchipExtract } from '../../utils/index.js';
import getOutbounds_Data from './outbounds.js';
import Config113 from '../../config/Singbox113.js';
import Config114 from '../../config/Singbox114.js';

export async function getsingbox_config(e) {
    const config = structuredClone(Verbose(e));
    e.urls = splitUrlsAndProxies(e.urls);

    const [
        outboundsResult,
        ruleResult,
        excludePackageResult,
        excludeAddressResult
    ] = await Promise.allSettled([
        getOutbounds_Data(e),
        fetchTemplate(e.rule, e.assets),
        e.exclude_package ? fetchpackExtract() : Promise.resolve(null),
        e.exclude_address ? fetchipExtract() : Promise.resolve(null),
    ]);

    if (outboundsResult.status === 'rejected') {
        throw outboundsResult.reason;
    }
    if (ruleResult.status === 'rejected') {
        throw ruleResult.reason;
    }
    const outboundsData = outboundsResult.value;
    const ruleData = normalizeRuleData(ruleResult.value, config, e);

    if (e.exclude_package && excludePackageResult.status === 'fulfilled') {
        e.Exclude_Package = excludePackageResult.value;
    }
    if (e.exclude_address && excludeAddressResult.status === 'fulfilled') {
        e.Exclude_Address = excludeAddressResult.value;
    }

    if (!outboundsData?.data) {
        const err = new Error(
            `Invalid outboundsData: missing data\n${JSON.stringify(outboundsData, null, 2)}`
        );
        err.raw = outboundsData;
        throw err;
    }
    if (!ruleData?.data) {
        const err = new Error(
            `Invalid ruleData: missing data\n${JSON.stringify(ruleData, null, 2)}`
        );
        err.raw = ruleData;
        throw err;
    }

    outboundsData.data.outbounds = filterOutbounds(outboundsData.data);
    const proxyTags = outboundsData.data.outbounds.map(res => res.tag);

    ruleData.data.outbounds = resolveOutboundGroups(
        ruleData.data.outbounds,
        proxyTags
    );
    ruleData.data.outbounds.push(...outboundsData.data.outbounds);

    applyTemplate(config, ruleData.data, e);

    return {
        status: outboundsData.status || 200,
        headers: outboundsData.headers || {},
        data: config,
    };
}

export function Verbose(e) {
    const ua = e.userAgent || '';
    const isSingbox = /sing|box|sfa|sfm/i.test(ua);

    let version = '1.14';
    let config = Config114;

    if (e.box114) {
        version = '1.14';
        config = Config114;
        e.singboxVersion = version;
        return config;
    }
    if (e.box113) {
        version = '1.13';
        config = Config113;
        e.singboxVersion = version;
        return config;
    }

    if (isSingbox) {
        if (/1\.13\.(\d+)/.test(ua)) {
            version = '1.13';
            config = Config113;
            e.singboxVersion = version;
            return config;
        }
        if (/1\.14\.(\d+)/.test(ua)) {
            version = '1.14';
            config = Config114;
            e.singboxVersion = version;
            return config;
        }
    }

    e.singboxVersion = version;
    return config;
}

export function normalizeRuleData(ruleData, config, e) {
    if (!ruleData?.data?.route || !Array.isArray(ruleData.data.route.rule_set)) {
        return ruleData;
    }

    if (e.singboxVersion === '1.13') {
        ruleData.data.route.rule_set = ruleData.data.route.rule_set.map(item => ({
            ...item,
            download_detour: 'direct',
        }));
        return ruleData;
    }

    if (e.singboxVersion === '1.14') {
        const httpClientTag = config?.http_clients?.[0]?.tag;
        if (httpClientTag) {
            ruleData.data.route.rule_set = ruleData.data.route.rule_set.map(item => ({
                ...item,
                http_client: httpClientTag,
            }));
        }
    }

    return ruleData;
}

const EXCLUDED_TYPES = new Set(['direct', 'block', 'dns', 'selector', 'urltest']);
export function filterOutbounds(data) {
    if (!data || !Array.isArray(data.outbounds)) return [];
    return data.outbounds.filter(outbound => {
        if (EXCLUDED_TYPES.has(outbound.type)) return false;
        if (outbound?.server === '') return false;
        if (outbound?.server_port < 1) return false;
        if (outbound?.password === '') return false;
        return true;
    });
}

export function resolveOutboundGroups(outbounds, outboundTags) {
    const allTags = Array.isArray(outboundTags)
        ? outboundTags.filter(t => typeof t === 'string')
        : [];

    const compileMatcher = (raw) => {
        if (typeof raw !== 'string' || !raw) return null;

        let pattern = raw;
        let flags = '';

        const m = raw.match(/^\/([\s\S]*)\/([gimsuy]*)$/);
        if (m) {
            pattern = m[1] || '';
            flags = m[2] || '';
        }

        const inlineFlags = new Set();
        pattern = pattern.replace(/\(\?([imsu])\)/gi, (_, f) => {
            inlineFlags.add(f.toLowerCase());
            return '';
        });

        flags = (flags || '').replace(/[gy]/g, '');
        for (const f of inlineFlags) flags += f;

        if (!flags.includes('u')) flags += 'u';
        // if (flags === '') flags += 'i';

        flags = [...new Set(flags)].join('');

        try {
            const re = new RegExp(pattern || '^$', flags);
            return (s) => {
                re.lastIndex = 0;
                return re.test(s);
            };
        } catch {
            return null;
        }
    };

    const groupMap = new Map();
    const referencedBy = new Map();

    const templateList = Array.isArray(outbounds) ? outbounds : (outbounds?.outbounds || []);

    for (const o of templateList) {
        if (!o?.tag) continue;
        groupMap.set(o.tag, {
            ...o,
            __outboundSet: new Set(Array.isArray(o.outbounds) ? o.outbounds : []),
            __filters: Array.isArray(o.filter) ? o.filter : [],
        });
    }

    for (const g of groupMap.values()) {
        for (const f of g.__filters) {
            if (!f?.action) continue;

            if (f.action === 'all') {
                for (const tag of allTags) g.__outboundSet.add(tag);
                continue;
            }

            const kws = Array.isArray(f.keywords) ? f.keywords : [f.keywords];
            const matchers = kws.map(kw => compileMatcher(kw)).filter(m => m !== null);
            if (!matchers.length && f.action !== 'exclude') continue;

            if (f.action === 'include') {
                for (const name of allTags) {
                    if (matchers.some(m => m(name))) g.__outboundSet.add(name);
                }
            } else if (f.action === 'exclude') {
                if (g.__outboundSet.size === 0) {
                    for (const tag of allTags) g.__outboundSet.add(tag);
                }
                for (const name of g.__outboundSet) {
                    if (matchers.some(m => m(name))) g.__outboundSet.delete(name);
                }
            }
        }
    }

    for (const g of groupMap.values()) {
        for (const ref of g.__outboundSet) {
            if (groupMap.has(ref)) {
                if (!referencedBy.has(ref)) referencedBy.set(ref, new Set());
                referencedBy.get(ref).add(g.tag);
            }
        }
    }

    const removed = new Set();
    const queue = [];

    for (const g of groupMap.values()) {
        if (g.__outboundSet.size === 0) queue.push(g.tag);
    }

    let head = 0;
    while (head < queue.length) {
        const deadTag = queue[head++];
        if (removed.has(deadTag)) continue;
        removed.add(deadTag);

        const parents = referencedBy.get(deadTag);
        if (parents) {
            for (const parentTag of parents) {
                const pg = groupMap.get(parentTag);
                if (!pg || removed.has(parentTag)) continue;

                pg.__outboundSet.delete(deadTag);
                if (pg.default === deadTag) delete pg.default;
                if (pg.__outboundSet.size === 0) queue.push(parentTag);
            }
        }
    }

    const result = [];
    for (const [tag, g] of groupMap) {
        if (removed.has(tag)) continue;
        const out = { ...g, outbounds: Array.from(g.__outboundSet) };
        delete out.__outboundSet;
        delete out.__filters;
        delete out.filter;
        result.push(out);
    }

    return result;
}

export function applyTemplate(top, rule, e) {
    top.route = top.route || {};
    if (rule) rule.route = rule.route || {};

    const topRuleSets = Array.isArray(top.route.rule_set) ? top.route.rule_set : [];
    const ruleRuleSets = Array.isArray(rule?.route?.rule_set) ? rule.route.rule_set : [];
    const rsSet = new Set();
    const finalRuleSets = [];

    for (let i = 0; i < topRuleSets.length; i++) {
        const item = topRuleSets[i];
        if (item?.tag) {
            rsSet.add(item.tag);
            finalRuleSets.push(item);
        }
    }
    for (let i = 0; i < ruleRuleSets.length; i++) {
        const item = ruleRuleSets[i];
        if (item?.tag && !rsSet.has(item.tag)) {
            rsSet.add(item.tag);
            finalRuleSets.push(item);
        }
    }
    top.route.rule_set = finalRuleSets;

    top.inbounds = rule?.inbounds || top.inbounds;

    const topOutbounds = Array.isArray(top.outbounds) ? top.outbounds : [];
    const ruleOutbounds = Array.isArray(rule?.outbounds) ? rule.outbounds : [];
    const outSet = new Set();
    const finalOutbounds = [];

    for (let i = 0; i < topOutbounds.length; i++) {
        const o = topOutbounds[i];
        if (o?.tag) {
            outSet.add(o.tag);
            finalOutbounds.push(o);
        }
    }
    for (let i = 0; i < ruleOutbounds.length; i++) {
        const o = ruleOutbounds[i];
        if (o?.tag && !outSet.has(o.tag)) {
            outSet.add(o.tag);
            finalOutbounds.push(o);
        }
    }
    top.outbounds = finalOutbounds;
    top.route.final = rule?.route?.final || top.route.final;

    const existingRules = Array.isArray(top.route.rules) ? top.route.rules : [];
    const newRules = Array.isArray(rule?.route?.rules) ? rule.route.rules : [];

    if (existingRules.length === 0 && newRules.length === 0) {
        top.route.rules = [];
    } else {
        const ruleTracker = new Set();
        const finalRules = [];

        const pushIfUnique = (r) => {
            const rsStr = Array.isArray(r.rule_set) ? r.rule_set.join(',') : (r.rule_set || '');
            const ipStr = Array.isArray(r.ip_cidr) ? r.ip_cidr.join(',') : (r.ip_cidr || '');
            const key = `${r.action}-${r.outbound}-${r.clash_mode}-${r.protocol}-${rsStr}-${ipStr}`;
            if (!ruleTracker.has(key)) {
                ruleTracker.add(key);
                finalRules.push(r);
            }
        };

        if (e.tls_fragment) {
            for (const r of [...existingRules, ...newRules]) {
                if (r.action === 'route-options') {
                    r.tls_fragment = true;
                    r.tls_fragment_fallback_delay = '5m';
                }
                pushIfUnique(r);
            }
        } else {
            for (const r of [...existingRules, ...newRules]) {
                pushIfUnique(r);
            }
        }

        top.route.rules = finalRules;
    }

    if (e.tun) {
        const filteredInbounds = [];
        for (let i = 0; i < (top.inbounds?.length || 0); i++) {
            if (top.inbounds[i].type !== 'tun') {
                filteredInbounds.push(top.inbounds[i]);
            }
        }
        top.inbounds = filteredInbounds;
    } else {
        if (e.exclude_package) addExcludePackage(top, e.Exclude_Package);
        if (e.exclude_address) addExcludeAddress(top, e.Exclude_Address);
    }

    if (e.tailscale) {
        top.dns = top.dns || { servers: [] };
        top.dns.servers = Array.isArray(top.dns.servers) ? top.dns.servers : [];
        top.dns.servers.push({
            type: 'tailscale',
            endpoint: 'ts-ep',
            accept_default_resolvers: true,
        });
        top.endpoints = top.endpoints || [];
        top.endpoints.push({
            type: 'tailscale',
            tag: 'ts-ep',
            auth_key: '',
            hostname: 'singbox-tailscale',
            udp_timeout: '5m',
        });
    }
}

export function addExcludePackage(singboxTopData, newPackages) {
    for (const inbound of singboxTopData.inbounds) {
        if (inbound.type === 'tun') {
            if (!Array.isArray(inbound['exclude_package'])) {
                inbound['exclude_package'] = [];
            }
            inbound['exclude_package'] = Array.from(new Set([...(inbound['exclude_package'] || []), ...newPackages]));
        }
    }
}

export function addExcludeAddress(singboxTopData, newddress) {
    for (const inbound of singboxTopData.inbounds) {
        if (inbound.type === 'tun') {
            inbound['route_address'] = ['0.0.0.0/1', '128.0.0.0/1', '::/1', '8000::/1'];
            if (!Array.isArray(inbound['route_exclude_address'])) {
                inbound['route_exclude_address'] = [];
            }
            inbound['route_exclude_address'] = Array.from(new Set([...(inbound['route_exclude_address'] || []), ...newddress]));
        }
    }
}