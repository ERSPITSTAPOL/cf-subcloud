import { getmihomo_config } from './core/mihomo/index.js';
import { getsingbox_config } from './core/singbox/index.js';
import { getv2ray_config } from './core/v2ray/index.js';
import { getFakePage } from './core/page/page.js';
import { buildConfig } from './utils/env.js';
import YAML from 'yaml';

export default {
    async fetch(request, env) {
        const e = buildConfig(request, env);

        if (e.urls.length === 0) {
            return new Response(await getFakePage(e), {
                status: 200,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
            });
        }

        try {
            let res;
            switch (e.target) {
                case 'singbox':
                    res = await getsingbox_config(e);
                    break;
                case 'mihomo':
                    res = await getmihomo_config(e);
                    break;
                case 'v2ray':
                    res = await getv2ray_config(e);
                    break;
                default:
                    throw new Error('Invalid config type');
            }

            const headers = new Headers(res.headers);
            let body;

            if (e.yaml) {
                body = YAML.stringify(res.data);
                headers.set('Content-Type', 'text/yaml; charset=utf-8');
            } else {
                body = JSON.stringify(res.data, null, 2);
                headers.set('Content-Type', 'application/json; charset=utf-8');
            }

            headers.set('Profile-web-page-url', e.url.origin);
            return new Response(body, { status: res.status || 200, headers });

        } catch (err) {
            return new Response(JSON.stringify({
                status: 500,
                success: false,
                error: err.message,
                raw: err.raw ?? null
            }, null, 2), {
                status: 200,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
            });
        }
    },
};