import { splitUrlsAndProxies, fetchpackExtract, fetchipExtract, fetchTemplate } from '../../utils/index.js';
import getProxies_Data from './proxies.js';
import clashConfig from '../../config/TopMihomo.js';

export async function getmihomo_config(e) {
    const config = structuredClone(clashConfig);
    e.urls = splitUrlsAndProxies(e.urls);

    const [
        proxiesResult,
        ruleResult,
        excludePackageResult,
        excludeAddressResult
    ] = await Promise.allSettled([
        getProxies_Data(e),
        fetchTemplate(e.rule, e.assets),
        e.exclude_package ? fetchpackExtract() : Promise.resolve(null),
        e.exclude_address ? fetchipExtract() : Promise.resolve(null),
    ]);

    if (proxiesResult.status === 'rejected') {
        throw proxiesResult.reason;
    }
    if (ruleResult.status === 'rejected') {
        throw ruleResult.reason;
    }
    const proxiesData = proxiesResult.value;
    const ruleData = ruleResult.value;

    if (e.exclude_package && excludePackageResult.status === 'fulfilled') {
        e.Exclude_Package = excludePackageResult.value;
    }
    if (e.exclude_address && excludeAddressResult.status === 'fulfilled') {
        e.Exclude_Address = excludeAddressResult.value;
    }

    if (!proxiesData?.data) {
        const err = new Error(
            `Invalid proxiesData: missing data\n${JSON.stringify(proxiesData, null, 2)}`
        );
        err.raw = proxiesData;
        throw err;
    }
    if (!ruleData?.data) {
        const err = new Error(
            `Invalid ruleData: missing data\n${JSON.stringify(ruleData, null, 2)}`
        );
        err.raw = ruleData;
        throw err;
    }

    ruleData.data.proxies = [...(ruleData.data.proxies || []), ...proxiesData.data.proxies];
    ruleData.data['proxy-groups'] = getProxies_Grouping(proxiesData.data, ruleData.data);
    ruleData.data['proxy-providers'] = proxiesData?.data?.providers || {};

    applyTemplate(config, ruleData.data, e);

    return {
        status: proxiesData.status || 200,
        headers: proxiesData.headers || {},
        data: config,
    };
}

export function applyTemplate(top, rule, e) {
    top['proxy-providers'] = rule['proxy-providers'] || {};
    top.proxies = [...(top.proxies || []), ...(rule.proxies || [])];
    top['proxy-groups'] = rule['proxy-groups'] || [];
    top.rules = [...(top.rules || []), ...(rule.rules || [])];
    top['sub-rules'] = rule['sub-rules'] || {};
    top['rule-providers'] = { ...(top['rule-providers'] || {}), ...(rule['rule-providers'] || {}) };

    const proxyName = rule['proxy-groups']?.[0]?.name;
    if (e.rule.external && top.dns?.nameserver && proxyName) {
        top.dns.nameserver = top.dns.nameserver.map((ns) => {
            if (typeof ns !== 'string') return ns;
            if (ns.includes('#PROXY')) return ns.replace('#PROXY', proxyName);
            return ns.replace(/(#)[^&\s]*/g, `$1${proxyName}`);
        });
    }

    if (e.tun && top.tun) {
        top.tun.enable = false;
    } else if (top.tun) {
        if (e.exclude_address && e.Exclude_Address) {
            top.tun['route-address'] = ['0.0.0.0/1', '128.0.0.0/1', '::/1', '8000::/1'];
            top.tun['route-exclude-address'] = e.Exclude_Address || [];
        }
        if (e.exclude_package && e.Exclude_Package) {
            top.tun['include-package'] = [];
            top.tun['exclude-package'] = e.Exclude_Package || [];
        }
    }

    if (!Object.keys(top['proxy-providers'] || {}).length) {
        delete top['proxy-providers'];
    }
    if (!Object.keys(top['sub-rules'] || {}).length) {
        delete top['sub-rules'];
    }
}

export function getProxies_Grouping(proxies, groups) {
    const srcProxies = Array.isArray(proxies?.proxies) ? proxies.proxies : [];
    const allNames = srcProxies.map(p => p?.name).filter(n => typeof n === 'string');
    const srcGroups = Array.isArray(groups?.['proxy-groups']) ? groups['proxy-groups'] : [];

    const groupMap = new Map();
    const referencedBy = new Map();

    const updatedGroups = srcGroups.map(g => {
        const name = g.name;
        const info = {
            ...g,
            __proxySet: new Set(Array.isArray(g.proxies) ? g.proxies : []),
            __useArr: Array.isArray(g.use) ? [...g.use] : [],
            __filterFn: compileMatcher(g.filter),
            __excludeFn: compileMatcher(g['exclude-filter']),
            __includeAll: g['include-all'] === true
        };
        groupMap.set(name, info);

        const currentRefs = [...info.__proxySet, ...info.__useArr];
        currentRefs.forEach(ref => {
            if (!referencedBy.has(ref)) referencedBy.set(ref, new Set());
            referencedBy.get(ref).add(name);
        });

        return info;
    });

    for (const g of updatedGroups) {
        const hasLogic = g.__filterFn || g.__excludeFn;

        if (g.__includeAll && !hasLogic) {
            allNames.forEach(n => g.__proxySet.add(n));
        } else if (hasLogic) {
            for (let i = 0; i < allNames.length; i++) {
                const name = allNames[i];
                if (g.__filterFn && !g.__filterFn(name)) continue;
                if (g.__excludeFn && g.__excludeFn(name)) continue;
                g.__proxySet.add(name);
            }
        }
    }

    const deletedSet = new Set();
    const queue = [];

    const isGroupEmpty = (g) => g.__proxySet.size === 0 && g.__useArr.length === 0;

    updatedGroups.forEach(g => {
        if (isGroupEmpty(g)) queue.push(g.name);
    });

    let head = 0;
    while (head < queue.length) {
        const target = queue[head++];
        if (deletedSet.has(target)) continue;
        deletedSet.add(target);

        const parents = referencedBy.get(target);
        if (parents) {
            for (const parentName of parents) {
                const parent = groupMap.get(parentName);
                if (!parent || deletedSet.has(parentName)) continue;

                parent.__proxySet.delete(target);
                parent.__useArr = parent.__useArr.filter(u => u !== target);

                if (parent['default-selected'] === target) {
                    delete parent['default-selected'];
                }

                if (isGroupEmpty(parent)) queue.push(parentName);
            }
        }
    }

    return updatedGroups
        .filter(g => !deletedSet.has(g.name))
        .map(g => {
            const out = { ...g, proxies: Array.from(g.__proxySet) };
            if (g.__useArr.length > 0) out.use = g.__useArr;
            else delete out.use;

            Object.keys(out).forEach(key => {
                if (key.startsWith('__') || ['filter', 'exclude-filter', 'include-all'].includes(key)) {
                    delete out[key];
                }
            });
            return out;
        });
}

function compileMatcher(raw) {
    if (typeof raw !== 'string' || raw.length === 0) return null;

    const hasIgnoreCase = /\(\?i\)/i.test(raw);
    let cleaned = raw.replace(/\(\?i\)/gi, '');

    let pattern;
    let flags = '';

    const m = cleaned.match(/^\/([\s\S]*)\/([gimsuy]*)$/);
    if (m) {
        pattern = m[1] || '';
        flags = (m[2] || '').replace(/[gy]/g, '');
    } else {
        pattern = cleaned;
        flags = '';
    }

    if (hasIgnoreCase && !flags.includes('i')) flags += 'i';

    // if (!flags.includes('i') && flags === '') {
    //     flags += 'i';
    // }

    if (!flags.includes('u')) flags += 'u';

    flags = Array.from(new Set(flags.split(''))).join('');

    try {
        const re = new RegExp(pattern, flags);
        return (name) => {
            re.lastIndex = 0;
            return re.test(name);
        };
    } catch {
        return null;
    }
}