// import fetch from 'node-fetch';
import YAML from 'yaml';
export const backimg = base64DecodeUtf8('');
export const subapi = base64DecodeUtf8('');
export const beiantext = base64DecodeUtf8('');
export const beiandizi = base64DecodeUtf8('');

// 实现base64解码UTF-8字符串的函数
export function base64DecodeUtf8(str) {
    const binary = atob(str);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
}

// 订阅链接
export function buildApiUrl(rawUrl, BASE_API, ua) {
    const params = new URLSearchParams({
        target: ua,
        url: rawUrl,
    });
    return `${BASE_API}/sub?${params}`;
}

// 处理请求
export async function fetchResponse(url, userAgent) {
    if (!userAgent) {
        userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3';
    }

    const MAX_MEMORY_LIMIT = 10 * 1024 * 1024;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': userAgent
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const headersObj = {};
        const subInfo = response.headers.get('subscription-userinfo');
        if (subInfo) {
            headersObj['subscription-userinfo'] = subInfo;
        }

        const reader = response.body?.getReader();
        if (!reader) return { status: response.status, data: await response.text() };

        const decoder = new TextDecoder('utf-8');
        let resultData = null;

        const { done: initialDone, value: initialValue } = await reader.read();
        if (!initialValue) return { status: response.status, data: "" };

        const firstChunk = decoder.decode(initialValue, { stream: true });
        const chunks = [firstChunk];
        let totalLength = firstChunk.length;

        const isJson = firstChunk.trimStart().startsWith('{');

        if (!isJson) {
            const startRegex = /(^|\n)proxies:/i;
            const endRegex = /\n(?=\S)/;
            let done = initialDone;

            while (true) {
                if (totalLength > MAX_MEMORY_LIMIT) {
                    await reader.cancel();
                    resultData = "ERROR: LIMIT_EXCEEDED";
                    break;
                }

                const buffer = chunks.join('');
                const startMatch = buffer.match(startRegex);
                if (startMatch) {
                    const startIndex = startMatch.index + (startMatch[1] ? startMatch[1].length : 0);
                    const rest = buffer.slice(startIndex);
                    const endMatch = rest.slice(8).match(endRegex);

                    if (endMatch) {
                        const segment = rest.slice(0, endMatch.index + 8);
                        try {
                            resultData = YAML.parse(segment, { maxAliasCount: -1, merge: true });
                        } catch {
                            resultData = segment;
                        }
                        await reader.cancel();
                        break;
                    }
                }

                if (done) break;
                const { done: nextDone, value: nextValue } = await reader.read();
                done = nextDone;
                if (nextValue) {
                    const chunk = decoder.decode(nextValue, { stream: true });
                    chunks.push(chunk);
                    totalLength += chunk.length;
                }
            }
        } else {
            let done = initialDone;
            while (!done) {
                if (totalLength > MAX_MEMORY_LIMIT) {
                    await reader.cancel();
                    break;
                }
                const { done: nextDone, value: nextValue } = await reader.read();
                done = nextDone;
                if (nextValue) {
                    const chunk = decoder.decode(nextValue, { stream: true });
                    chunks.push(chunk);
                    totalLength += chunk.length;
                }
            }
            const buffer = chunks.join('');
            try {
                resultData = JSON.parse(buffer);
            } catch {
                resultData = buffer;
            }
        }

        if (resultData === null) {
            const buffer = chunks.join('');
            try {
                resultData = YAML.parse(buffer, { maxAliasCount: -1, merge: true });
            } catch {
                resultData = buffer;
            }
        }

        return { status: response.status, headers: headersObj, data: resultData };

    } catch (err) {
        return { status: 500, error: err.message };
    }
}

export async function fetchTemplate({ url, external }, assets) {
    const defaultUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3';
    let response;

    try {
        const fetcher = external ? globalThis : (assets ?? globalThis);
        response = await fetcher.fetch(url, {
            method: 'GET',
            headers: { 'User-Agent': defaultUA },
        });
    } catch (err) {
        return { status: 0, headers: {}, data: `FETCH_ERROR: ${String(err)}` };
    }

    const headersObj = Object.fromEntries(response.headers.entries());
    let text;
    try {
        text = await response.text();
    } catch (err) {
        return { status: response.status, headers: headersObj, data: `READ_ERROR: ${String(err)}` };
    }

    const contentType = (headersObj['content-type'] || '').toLowerCase();
    let isJson;
    if (contentType.includes('application/json')) {
        isJson = true;
    } else if (contentType.includes('yaml') || contentType.includes('text/plain')) {
        isJson = false;
    } else {
        isJson = new URL(url).pathname.toLowerCase().endsWith('.json');
    }

    const tryOrder = isJson ? ['json', 'yaml'] : ['yaml', 'json'];
    const errors = [];

    for (const type of tryOrder) {
        try {
            if (type === 'yaml') {
                const val = YAML.parse(text, { maxAliasCount: -1, merge: true });
                return { status: response.status, headers: headersObj, data: val };
            } else {
                const val = JSON.parse(text);
                return { status: response.status, headers: headersObj, data: val };
            }
        } catch (e) {
            errors.push(`${type.toUpperCase()}_PARSE_ERROR: ${e.message}`);
        }
    }

    return { 
        status: response.status, 
        headers: headersObj, 
        data: `PARSE_FAILED: [${errors.join(' | ')}]` 
    };
}

// 将订阅链接和代理地址分离
export function splitUrlsAndProxies(urls) {
    const result = [];
    let proxyText = '';

    for (const url of urls) {
        if (url.startsWith('http://') || url.startsWith('https://')) {
            result.push(url);
        } else {
            if (proxyText) {
                proxyText += ',';
            }
            proxyText += url;
        }
    }
    if (proxyText) {
        result.push(proxyText);
    }
    return result;
}

/**
 * 获取应用包名列表
 * @returns {Promise<Object>} - 返回配置数据对象
 */
export async function fetchpackExtract() {
    const processNames = new Set();

    const urls = [
        'https://github.com/mnixry/direct-android-ruleset/raw/refs/heads/rules/@Merged/GAME.mutated.yaml',
        'https://github.com/mnixry/direct-android-ruleset/raw/refs/heads/rules/@Merged/APP.mutated.yaml',
    ];

    const excludeCommentKeywords = ['浏览器'];
    const excludeNames = new Set(['com.android.chrome', 'mark.via']);

    const results = await Promise.allSettled(urls.map(url => fetchResponse(url)));

    for (let i = 0; i < results.length; i++) {
        if (results[i].status === 'rejected') {
            console.error(`❌ 请求失败: ${urls[i]}`);
            continue;
        }

        const res = results[i].value;
        if (!res || res === true || res.status !== 200) {
            console.error(`❌ 请求失败: ${urls[i]}`);
            continue;
        }

        // fetchResponse 可能返回对象或字符串
        const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);

        for (const line of text.split('\n')) {
            const match = line.match(/PROCESS-NAME\s*,\s*([^\s,]+)/);

            if (match) {
                const processName = match[1];

                const hasExcludedComment = excludeCommentKeywords.some((keyword) => line.includes(keyword));

                if (!hasExcludedComment && !excludeNames.has(processName)) {
                    processNames.add(processName);
                }
            }
        }
    }

    return [...processNames];
}
/**
 * 获取IPCIDR列表
 * @returns {Promise<Object>} - 返回配置数据对象
 */
export async function fetchipExtract() {
    const urls = ['https://raw.githubusercontent.com/Kwisma/clash-rules/release/cncidr.yaml'];

    const results = await Promise.allSettled(urls.map(url => fetchResponse(url)));

    const ipcidrs = [];

    for (let i = 0; i < results.length; i++) {
        if (results[i].status === 'rejected') {
            console.error(`❌ 请求失败: ${urls[i]} - rejected`);
            continue;
        }

        const res = results[i].value;
        if (!res || res.status !== 200) {
            console.error(`❌ 请求失败: ${urls[i]} - ${res?.status}`);
            continue;
        }

        const jsondata = res.data;

        if (jsondata && Array.isArray(jsondata.payload)) {
            ipcidrs.push(...jsondata.payload);
        }
    }

    return ipcidrs;
}