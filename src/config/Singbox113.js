const Config113 = {
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
      store_rdrc: false
    }
  },
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
        server: "local",
        strategy: "prefer_ipv4"
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
        strategy: "prefer_ipv4",
        disable_cache: true
      },
      {
        action: "route",
        rule_set: "geolocation-cn",
        server: "local",
        strategy: "prefer_ipv4"
      },
      {
        action: "route",
        query_type: ["A", "AAAA"],
        server: "dns-fake",
        strategy: "prefer_ipv4",
        disable_cache: true
      }
    ],
    strategy: "ipv4_only",
    final: "remote",
    disable_cache: false,
    disable_expire: false,
    cache_capacity: 1024,
    reverse_mapping: false,
    independent_cache: false
  },
  inbounds: [
    {
      tag: "tun-in",
      type: "tun",
      mtu: 9000,
      address: ["172.19.0.1/30", "fdfe:dcba:9876::1/126"],
      stack: "system",
      auto_route: true,
      strict_route: true,
      endpoint_independent_nat: false,
      udp_timeout: "300s",
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
    default_domain_resolver: {
      server: "ali",
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
        download_detour: "direct"
      },
      {
        tag: "geosite-googlefcm",
        type: "remote",
        format: "binary",
        url: "https://fastly.jsdelivr.net/gh/SagerNet/sing-geosite@rule-set-unstable/geosite-googlefcm.srs",
        download_detour: "direct"
      },
      {
        tag: "geosite-google",
        type: "remote",
        format: "binary",
        url: "https://fastly.jsdelivr.net/gh/SagerNet/sing-geosite@rule-set-unstable/geosite-google.srs",
        download_detour: "direct"
      },
      {
        tag: "geolocation-cn",
        type: "remote",
        format: "binary",
        url: "https://fastly.jsdelivr.net/gh/SagerNet/sing-geosite@rule-set-unstable/geosite-geolocation-cn.srs",
        download_detour: "direct"
      }
    ]
  }
};
export default Object.freeze(Config113);