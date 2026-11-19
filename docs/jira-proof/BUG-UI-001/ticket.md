# Login page: the page takes more than 3 seconds to be ready

| Field | Value |
|---|---|
| Issue type | Bug |
| Priority | **Low** |
| Severity | Low |
| Screen | Sign In |
| Environment | Staging web app https://staging.performance.lmdmax.com, Chrome (desktop) |
| Found on | 2026-11-02 (staging) |
| Retested | 2026-11-16: still reproduces (1 of 1 automated checks fail) |
| QA reference | BUG-UI-001 |
| Attach | screenshot-1.png, video-1.webm |

**Summary:** the login test sheet (TC_LOGIN_001) asks for the login page within 3 seconds. On staging
the page was ready after 5.3 to 7.6 seconds when it was opened alone, and after up to 43 seconds when
4 tests opened it at the same time.

**Steps to replicate**

1. Open DevTools (**F12**) → **Network**, and tick **Disable cache**.
2. Open <https://staging.performance.lmdmax.com/signIn>.
3. Read **DOMContentLoaded** at the bottom of the Network tab.

**Expected result:** less than 3 seconds.

**Actual result:** 5 to 8 seconds (measured from India). The page loads about 4 MB of scripts
(`hooks-….js` is 2.9 MB, `index-….js` 0.9 MB).

**To confirm:** staging may be slower than production, and the time depends on the network. Please
check the time on production and agree on the target.

**Business impact:** a slow first page makes the product feel slow, especially on mobile networks.
