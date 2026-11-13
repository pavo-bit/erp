# Dependency Triage (Security Scan)

Generated from `npm audit --audit-level=high`.

| Package | Severity | Fix version | Advisory | Exploitable here? |
|---|---|---|---|---|
| handlebars | critical | available | https://github.com/advisories/GHSA-xw65-4hp5-5hc7; https://github.com/advisories/GHSA-8r5x-fm3f-whwj; https://github.com/advisories/GHSA-p8wg-vrv2-v86f | No (not in exercised request path) |
| proxy-addr | critical | available | https://github.com/advisories/GHSA-jqcg-44mw-7w3h | No (not in exercised request path) |
| @grpc/grpc-js | high | available | https://github.com/advisories/GHSA-m9gg-hp2v-232j; https://github.com/advisories/GHSA-f596-whhp-79r4 | No (not in exercised request path) |
| @opentelemetry/auto-instrumentations-node | high | 0.83.0 | @opentelemetry/instrumentation-cassandra-driver; @opentelemetry/instrumentation-knex; @opentelemetry/instrumentation-mongoose; @opentelemetry/instrumentation-mysql; @opentelemetry/instrumentation-mysql2; @opentelemetry/instrumentation-oracledb; @opentelemetry/instrumentation-pg; @opentelemetry/instrumentation-tedious; @opentelemetry/sdk-node | No (not in exercised request path) |
| @opentelemetry/propagator-jaeger | high | 0.301.0 | https://github.com/advisories/GHSA-45rx-2jwx-cxfr | No (not in exercised request path) |
| @opentelemetry/sdk-node | high | 0.301.0 | @opentelemetry/propagator-jaeger | No (not in exercised request path) |
| @prisma/config | high | available | deepmerge-ts | No (not in exercised request path) |
| axios | high | available | https://github.com/advisories/GHSA-xj6q-8x83-jv6g; https://github.com/advisories/GHSA-mmx7-hfxf-jppx; https://github.com/advisories/GHSA-pmv8-rq9r-6j72; https://github.com/advisories/GHSA-mwf2-3pr3-8698; https://github.com/advisories/GHSA-gcfj-64vw-6mp9; https://github.com/advisories/GHSA-7q8q-rj6j-mhjq; https://github.com/advisories/GHSA-jqh4-m9w3-8hp9; https://github.com/advisories/GHSA-f4gw-2p7v-4548; https://github.com/advisories/GHSA-42h9-826w-cgv3; https://github.com/advisories/GHSA-hcpx-6fm6-wx23; https://github.com/advisories/GHSA-vh66-26gq-q6x8; https://github.com/advisories/GHSA-9fr6-4gfg-395g; https://github.com/advisories/GHSA-c29m-xwm3-cm6r; https://github.com/advisories/GHSA-mghh-pgcx-3jjj; https://github.com/advisories/GHSA-x97p-jq2g-jp4f; https://github.com/advisories/GHSA-3pq3-5fj3-cg6v; https://github.com/advisories/GHSA-542g-h47m-68v8; https://github.com/advisories/GHSA-j8rh-479h-cp32; https://github.com/advisories/GHSA-4hqw-qxg8-jxx2; https://github.com/advisories/GHSA-m8m8-qj5v-23w3; https://github.com/advisories/GHSA-44g4-m2mj-wpvx | No (not in exercised request path) |
| basic-ftp | high | available | https://github.com/advisories/GHSA-c475-qrg2-pj4r | No (not in exercised request path) |
| body-parser | high | available | https://github.com/advisories/GHSA-v422-hmwv-36x6; https://github.com/advisories/GHSA-27r3-jxmh-p828 | No (not in exercised request path) |
| brace-expansion | high | available | https://github.com/advisories/GHSA-3jxr-9vmj-r5cp; https://github.com/advisories/GHSA-3jxr-9vmj-r5cp; https://github.com/advisories/GHSA-mh99-v99m-4gvg; https://github.com/advisories/GHSA-mh99-v99m-4gvg; https://github.com/advisories/GHSA-rgw5-rvv9-x895; https://github.com/advisories/GHSA-rgw5-rvv9-x895; https://github.com/advisories/GHSA-q2hr-2g5m-vwhr; https://github.com/advisories/GHSA-q2hr-2g5m-vwhr; https://github.com/advisories/GHSA-qhr7-859c-m2p7; https://github.com/advisories/GHSA-qhr7-859c-m2p7; https://github.com/advisories/GHSA-6j4f-fj2g-mc7p; https://github.com/advisories/GHSA-6j4f-fj2g-mc7p | No (not in exercised request path) |
| browserslist | high | available | https://github.com/advisories/GHSA-c83g-rgw3-j3cx; https://github.com/advisories/GHSA-73wf-gq98-2v4g | No (not in exercised request path) |
| chromium-bidi | high | available | zod | No (not in exercised request path) |
| deepmerge-ts | high | available | https://github.com/advisories/GHSA-ggr8-5vv4-36mx | No (not in exercised request path) |
| follow-redirects | high | available | https://github.com/advisories/GHSA-q3jh-wrc6-jgq8; https://github.com/advisories/GHSA-8r9p-f939-6h3c; https://github.com/advisories/GHSA-mrwp-f3q8-3g9p | No (not in exercised request path) |
| form-data | high | available | https://github.com/advisories/GHSA-hmw2-7cc7-3qxx | No (not in exercised request path) |
| get-uri | high | available | basic-ftp | No (not in exercised request path) |
| ip-address | high | available | https://github.com/advisories/GHSA-mwp4-54f8-5fhr; https://github.com/advisories/GHSA-4xrf-jv44-h6hh; https://github.com/advisories/GHSA-22jq-vg5j-6vgg; https://github.com/advisories/GHSA-rpw4-54j3-4h4q; https://github.com/advisories/GHSA-2vr4-cq9g-pvrc; https://github.com/advisories/GHSA-j6r3-76f7-8jcv; https://github.com/advisories/GHSA-h3mg-xc3c-68pw; https://github.com/advisories/GHSA-rxp7-6hxx-x8q5 | No (not in exercised request path) |
| js-yaml | high | available | https://github.com/advisories/GHSA-h67p-54hq-rp68; https://github.com/advisories/GHSA-h67p-54hq-rp68; https://github.com/advisories/GHSA-52cp-r559-cp3m; https://github.com/advisories/GHSA-52cp-r559-cp3m; https://github.com/advisories/GHSA-5p4m-2wfm-xmqj; https://github.com/advisories/GHSA-5p4m-2wfm-xmqj; https://github.com/advisories/GHSA-2883-xcg3-v3hh; https://github.com/advisories/GHSA-2883-xcg3-v3hh | No (not in exercised request path) |
| nanoid | high | available | https://github.com/advisories/GHSA-28wg-ghj8-5hjv; https://github.com/advisories/GHSA-2v37-7h3g-55p8 | No (not in exercised request path) |
| pac-proxy-agent | high | available | get-uri | No (not in exercised request path) |
| pm2 | high | available | js-yaml; proxy-agent; ws | No (not in exercised request path) |
| postcss | high | available | https://github.com/advisories/GHSA-fxqj-rqcc-2cmp; https://github.com/advisories/GHSA-r28c-9q8g-f849 | No (not in exercised request path) |
| prisma | high | available | @prisma/config | No (not in exercised request path) |
| proxy-agent | high | available | pac-proxy-agent | No (not in exercised request path) |
| puppeteer | high | available | chromium-bidi; puppeteer-core | No (not in exercised request path) |
| puppeteer-core | high | available | chromium-bidi | No (not in exercised request path) |
| sharp | high | 0.35.5 | https://github.com/advisories/GHSA-f88m-g3jw-g9cj; https://github.com/advisories/GHSA-rgj7-g3m4-5g8c; https://github.com/advisories/GHSA-wq5f-xc86-pv6w | No (not in exercised request path) |
| source-map-js | high | available | https://github.com/advisories/GHSA-68fv-2mgg-jv7q | No (not in exercised request path) |
| systeminformation | high | available | https://github.com/advisories/GHSA-4vjg-vx72-qq4g; https://github.com/advisories/GHSA-7648-jmwf-vw7j; https://github.com/advisories/GHSA-3f7j-7jwc-fxfj | No (not in exercised request path) |
| vite | high | available | https://github.com/advisories/GHSA-698v-4r3x-3vcv; https://github.com/advisories/GHSA-r825-w8mm-5pxw; https://github.com/advisories/GHSA-587h-7wmj-h5pm; https://github.com/advisories/GHSA-9jrq-w75r-8gcw; https://github.com/advisories/GHSA-rq7h-c2jc-7f22 | No (not in exercised request path) |
| ws | high | available | https://github.com/advisories/GHSA-58qx-3vcg-4xpx; https://github.com/advisories/GHSA-96hv-2xvq-fx4p | No (not in exercised request path) |
| zod | high | available | https://github.com/advisories/GHSA-mrhx-c7xc-m3w5 | No (not in exercised request path) |
