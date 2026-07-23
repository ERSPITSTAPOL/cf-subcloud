export function modes(sub, userAgent) {
    const modes = {
        mihomo: {
            name: 'Clash (mihomo)',
            placeholder: '请输入clash订阅地址url，支持各种订阅或单节点链接',
            tipText: `
## mihomo 使用提示：

- 支持各种订阅或单节点链接，自动合并生成配置
- mixed(http/socks) 端口: 7890
- 适用于 mihomo 客户端
- 防止 DNS 泄漏(安全DNS/DoH)
- 关闭所有覆写功能(不是关闭功能，是关闭覆写)以确保配置正常生效

## 附加参数说明

- UDP : 启用 UDP 代理流量 [查看详情](https://wiki.metacubex.one/config/proxies/#udp)
- 分应用代理: 排除 CN 应用(仅包含android应用)不入代理工具 [查看详情](https://wiki.metacubex.one/config/inbound/tun/#exclude-package)
- 分IPCIDR代理: 排除 CN IP 不进入代理工具 [查看详情](https://wiki.metacubex.one/config/inbound/tun/#route-exclude-address)
- 仅代理: 关闭 VPN 代理，使用 mixed(http/socks) 端口进行代理。实际就是关闭了 tun 入站
- 输出为YAML: 勾选后生成的配置文件将自动转换成YAML文件

## 配置信息

**userAgent** ${userAgent}

<!-- **转换后端** ${sub} -->
                `,
            protocolOptions: [
                { value: 'udp', label: '启用 UDP', checked: true },
                { value: 'ech', label: '启用 ECH' },
                { value: 'ep', label: '启用 分应用代理(仅Android)' },
                { value: 'ea', label: '启用 分IPCIDR代理(ios/macOS/windows/linux 推荐)' },
                { value: 'tun', label: '启用 仅代理' },
                { value: 'yaml', label: '输出为YAML', checked: true },
            ],
        },
        singbox: {
            name: 'Singbox',
            placeholder: '请输入singbox订阅地址url，支持各种订阅或单节点链接',
            tipText: `
## singbox 使用提示：

- 支持各种订阅或单节点链接，自动合并生成配置
- 适用于 sing-box 客户端
- 支持 1.13.x
- 支持 1.14.x
- 防止 DNS 泄漏(安全DNS/DoH)
- 关闭所有覆写功能(不是关闭功能，是关闭覆写)以确保配置正常生效

## 附加参数说明

- UDP: 启用 UDP 代理流量 [查看详情](https://sing-box.sagernet.org/zh/configuration/route/rule_action/#udp_disable_domain_unmapping)
- UDP 分段: [查看详情](https://sing-box.sagernet.org/zh/configuration/shared/dial/#udp_fragment)
- TLS 分段: 绕过被防火墙拦截的域名 [查看详情](https://sing-box.sagernet.org/zh/configuration/route/rule_action/#tls_fragment)
- 分应用代理: 排除 CN 应用(仅包含android应用)不入代理工具 [查看详情](https://sing-box.sagernet.org/zh/configuration/inbound/tun/#exclude_package)
- 分IPCIDR代理: 排除 CN IP 不进入代理工具 [查看详情](https://sing-box.sagernet.org/zh/configuration/inbound/tun/#route_exclude_address)
- tailscale: [查看详情](https://sing-box.sagernet.org/zh/configuration/endpoint/tailscale)
- 仅代理: 关闭 VPN 代理，使用 mixed(http/socks) 端口进行代理。实际就是关闭了 tun 入站

## 配置信息

**userAgent** ${userAgent}

<!-- **转换后端** ${sub} -->
                `,
            protocolOptions: [
                { value: 'ech', label: '启用 ECH' },
                { value: 'udp_frag', label: '启用 UDP 分段' },
                { value: 'tls_frag', label: '启用 TLS 分段' },
                { value: 'ep', label: '启用 分应用代理(仅Android)' },
                { value: 'ea', label: '启用 分IPCIDR代理(ios/macOS/windows/linux 推荐)' },
                { value: 'tailscale', label: '启用 tailscale' },
                { value: 'tun', label: '启用 仅代理' },
                { value: 'box1.13', label: 'Singbox 1.13', lock: 'version' },
                { value: 'box1.14', label: 'Singbox 1.14', lock: 'version' },
            ],
        },
        v2ray: {
            name: 'V2Ray',
            placeholder: '请输入V2Ray订阅地址url, 支持各种订阅或单节点链接',
//            tipText: `
// <!-- **转换后端** ${sub} -->
//                `,
            protocolOptions: [],
            noTemplate: true, // 添加此标志表示不需要 protocolOptions 和 模板
        },
    };
    return JSON.stringify(modes);
}

export function configs() {
    const data = {
        mihomo: [
            {
                label: '策略组和规则',
                options: [
                    {
                        label: '简易分流 Noicon',
                        value: '/ruleER.yaml',
                    },
                    {
                        label: '简易分流 Withicon',
                        value: '/ruleFL.yaml',
                    },
                ],
            },
        ],
        singbox: [
            {
                label: '策略组和规则',
                options: [
                    {
                        label: '简易分流',
                        value: '/sing_rules.json',
                    },
                ],
            },
        ],
    };
    return JSON.stringify(data);
}