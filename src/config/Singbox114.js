const Config114 = {
  log: {
    disabled: true,
    level: "error",
    timestamp: false
  },
  certificate: {
    store: "mozilla"
  },
  experimental: {
    clash_api: {
      default_mode: "Rule"
    },
    cache_file: {
      enabled: true,
      store_fakeip: false,
      store_dns: false
    }
  },
  http_clients: [
    {
      tag: "bootstrap",
      engine: "go",
      version: 2
    }
  ],
  dns: {
    servers: [
      {
        tag: "remote",
        type: "tcp",
        server: "8.8.8.8",
        detour: "Final"
      },
      {
        tag: "ali",
        type: "quic",
        server_port: 853,
        server: "223.5.5.5"
      },
      {
        tag: "local",
        type: "local",
        prefer_go: false
      },
      {
        tag: "dns-fake",
        type: "fakeip",
        inet4_range: "198.51.100.0/24",
        inet6_range: "2001:2::/64"
      }
    ],
    rules: [
      {
        action: "route",
        clash_mode: "Direct",
        server: "local"
      },
      {
        action: "route",
        clash_mode: "Global",
        server: "remote"
      },
      {
        action: "reject",
        method: "drop",
        rule_set: "geosite-category-ads-all"
      },
      {
        action: "route",
        rule_set: "geosite-googlefcm",
        server: "remote"
      },
      {
        action: "reject",
        method: "drop",
        query_type: "HTTPS"
      },
      {
        action: "route",
        rule_set: "geosite-google",
        server: "dns-fake",
        disable_cache: true
      },
      {
        action: "route",
        rule_set: "geolocation-cn",
        server: "local"
      },
      {
        action: "route",
        query_type: ["A", "AAAA"],
        server: "dns-fake",
        disable_cache: true
      }
    ],
    final: "remote",
    timeout: "5s",
    strategy: "prefer_ipv4",
    disable_cache: false,
    disable_expire: false,
    cache_capacity: 1024,
    reverse_mapping: false,
    optimistic: {enabled:true, timeout:"3d"}
  },
  inbounds: [
    {
      tag: "tun-in",
      type: "tun",
      mtu: 9000,
      address: ["172.19.0.1/30", "fdfe:dcba:9876::1/126"],
      stack: "system",
      dns_mode: "hijack",
      dns_address: ["172.18.0.2","fdfe:dcba:9876::2"],
      auto_route: true,
      strict_route: true,
      endpoint_independent_nat: false,
      udp_timeout: "300s",
      udp_mapping: "endpoint_independent",
      udp_filtering: "address_dependent",
      udp_nat_max: 4096,
      platform: {
        http_proxy: {
          enabled: false,
          server: "127.0.0.1",
          server_port: 7890
        }
      }
    }
  ],
  outbounds: [
    {
      type: "direct",
      tag: "direct"
    }
  ],
  route: {
    default_http_client: "bootstrap",
    default_domain_resolver: {
      server: "ali",
      timeout: "5s",
      strategy: "prefer_ipv4"
    },
    auto_detect_interface: true,
    override_android_vpn: false,
    final: "Final",
    rules: [
      {
        action: "hijack-dns",
        port: 53
      }
    ],
    rule_set: [
      {
        tag: "geosite-category-ads-all",
        type: "remote",
        format: "binary",
        url: "https://fastly.jsdelivr.net/gh/SagerNet/sing-geosite@rule-set-unstable/geosite-category-ads-all.srs",
        http_client: "bootstrap"
      },
      {
        tag: "geosite-googlefcm",
        type: "remote",
        format: "binary",
        url: "https://fastly.jsdelivr.net/gh/SagerNet/sing-geosite@rule-set-unstable/geosite-googlefcm.srs",
        http_client: "bootstrap"
      },
      {
        tag: "geosite-google",
        type: "remote",
        format: "binary",
        url: "https://fastly.jsdelivr.net/gh/SagerNet/sing-geosite@rule-set-unstable/geosite-google.srs",
        http_client: "bootstrap"
      },
      {
        tag: "geolocation-cn",
        type: "remote",
        format: "binary",
        url: "https://fastly.jsdelivr.net/gh/SagerNet/sing-geosite@rule-set-unstable/geosite-geolocation-cn.srs",
        http_client: "bootstrap"
      }
    ]
  }
};
export default Object.freeze(Config114);