const Mihomo_Top_Data = {
  mode: "rule",
  "mixed-port": 7890,
  ipv6: true,
  "allow-lan": false,
  "bind-address": "*",
  "lan-allowed-ips": [
    "192.168.0.0/16",
    "fc00::/7"
  ],
  "unified-delay": false,
  "tcp-concurrent": false,
  "log-level": "silent",
  "find-process-mode": "off",
  "geodata-mode": false,
  "geodata-loader": "memconservative",
  "geosite-matcher": "mph",
  "geo-auto-update": false,
  "global-ua": "clash.meta",
  "etag-support": true,
  "disable-keep-alive": true,
  "keep-alive-idle": 30,
  "keep-alive-interval": 15,
  "skip-auth-prefixes": [
    "127.0.0.1/24",
    "::1/128",
    "fc00::/7"
  ],
  profile: {
    "store-selected": true,
    "store-fake-ip": false
  },
  sniffer: {
    enable: false,
    "force-dns-mapping": true,
    "parse-pure-ip": true,
    "override-destination": false,
    sniff: {
      HTTP: {
        ports: [
          80,
          "8080-8880"
        ],
        "override-destination": false
      },
      TLS: {
        ports: [
          443,
          8443
        ],
        "override-destination": false
      },
      QUIC: {
        ports: [
          443,
          8443
        ],
        "override-destination": false
      }
    }
  },
  tun: {
    enable: true,
    stack: "system",
    mtu: 9000,
    "udp-timeout": 300,
    "auto-route": true,
    "strict-route": true,
    "auto-redirect": false,
    "auto-detect-interface": true,
    "disable-icmp-forwarding": true,
    "endpoint-independent-nat": false,
    "dns-hijack": [
      "any:53"
    ]
  },
  dns: {
    enable: true,
    "cache-algorithm": "lru",
    "cache-max-size": 1024,
    "prefer-h3": false,
    "use-hosts": false,
    "use-system-hosts": false,
    "respect-rules": false,
    ipv6: true,
    "ipv6-timeout": 200,
    "enhanced-mode": "fake-ip",
    "fake-ip-ttl": 1,
    "fake-ip-range": "198.51.100.0/24",
    "fake-ip-range6": "2001:2::/64",
    "fake-ip-filter-mode": "blacklist",
    "fake-ip-filter": [
      "*.lan",
      "+.microsoftonline-p.com",
      "+.microsoftonline.com",
      "+.msftconnecttest.com",
      "+.msftncsi.com",
      "+.microsoft.com",
      "+.dl.l.google.com",
      "mtalk.google.com",
      "mtalk-dev.google.com",
      "mtalk-staging.google.com",
      "mtalk4.google.com",
      "alt1-mtalk.google.com",
      "alt2-mtalk.google.com",
      "alt3-mtalk.google.com",
      "alt4-mtalk.google.com",
      "alt5-mtalk.google.com",
      "alt6-mtalk.google.com",
      "alt7-mtalk.google.com",
      "alt8-mtalk.google.com",
      "rule-set:geolocation-cn"
    ],
    "default-nameserver": [
      "quic://223.5.5.5:853"
    ],
    nameserver: [
      "tcp://8.8.8.8#🚀Global&disable-ipv6=true"
    ],
    "proxy-server-nameserver": [
      "quic://223.5.5.5:853"
    ],
    "nameserver-policy": {
      "rule-set:tld-cn,geolocation-cn": [
        "system"
      ]
    },
    "direct-nameserver": [
      "quic://223.5.5.5:853"
    ],
    "direct-nameserver-follow-policy": true
  },
  "rule-providers": {
    "geolocation-cn": {
      type: "http",
      interval: 0,
      behavior: "domain",
      format: "mrs",
      proxy: "🚀Global",
      url: "https://fastly.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite/geolocation-cn.mrs"
    },
    "tld-cn": {
      type: "http",
      interval: 0,
      behavior: "domain",
      format: "mrs",
      proxy: "🚀Global",
      url: "https://fastly.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite/tld-cn.mrs"
    }
  }
};
export default Object.freeze(Mihomo_Top_Data);