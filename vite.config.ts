import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readFile } from 'node:fs/promises'
import { join, normalize, sep } from 'node:path'

/**
 * 11-3 1차-21 — dev server에서 `/etl-data/*` URL을 `data/clean.real/*`로 매핑.
 * 11-3 1차-26 — `*_master.json` 파일은 `data/master.real/*`로 분기.
 * 11-3 1차-32 — `*.mart.json` 파일은 `data/mart.real/*`로 분기.
 * 11-3 1차-40 — `*.real.json` 파일은 `data/indicator.real/*`로 분기.
 *
 * etlAdapter (VITE_DATA_SOURCE=etl)가 runtime fetch로 ETL 산출물을 읽기 위함.
 * dev 전용이며, production build는 middleware가 동작하지 않아 fetch 404 →
 * etlAdapter가 mockAdapter로 fallback (CLAUDE.md §17 narrow scope 정책 일관).
 *
 * 분기 정책 (1차-40 갱신):
 * - URL 경로 마지막 파일명이 `.mart.json`으로 끝나면 → `data/mart.real/`에서 읽음
 *   (예: `/etl-data/B/region_summary.mart.json` → `data/mart.real/B/region_summary.mart.json`).
 * - 그 외 `.real.json`으로 끝나면 → `data/indicator.real/`에서 읽음 (1차-40 신규)
 *   (예: `/etl-data/B/transition_index.real.json` → `data/indicator.real/B/transition_index.real.json`).
 *   `.mart.json` 검사가 우선이므로 `region_summary.mart.json`은 indicator.real로 잘못 라우팅되지 않음.
 * - 그 외 `_master.json`으로 끝나면 → `data/master.real/`에서 읽음
 *   (예: `/etl-data/B/school_master.json` → `data/master.real/B/school_master.json`).
 * - 그 외 → 기존 `data/clean.real/`에서 읽음 (예: `/etl-data/B/schools.clean.json`).
 *
 * `data/clean.real/` · `data/master.real/` · `data/mart.real/` · `data/indicator.real/` 모두
 * gitignored — 파일 부재 시 404 응답, etlAdapter fallback. path traversal 방어: `..` 포함
 * URL은 차단.
 */
function etlDataMiddlewarePlugin(): Plugin {
  const URL_PREFIX = '/etl-data/'
  const CLEAN_REAL_ROOT = join(process.cwd(), 'data', 'clean.real')
  const MASTER_REAL_ROOT = join(process.cwd(), 'data', 'master.real')
  const MART_REAL_ROOT = join(process.cwd(), 'data', 'mart.real')
  const INDICATOR_REAL_ROOT = join(process.cwd(), 'data', 'indicator.real')
  return {
    name: 'etl-data-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith(URL_PREFIX)) return next()
        const relativePath = req.url.slice(URL_PREFIX.length).split('?')[0]
        if (relativePath.includes('..')) {
          res.statusCode = 400
          res.end()
          return
        }
        // 11-3 1차-40 갱신 — 분기 순서:
        //   1) `.mart.json` → mart.real (1차-32)
        //   2) `.real.json` → indicator.real (1차-40 신규, `.mart.json` 다음에 검사하여
        //      `region_summary.mart.json`이 indicator.real로 잘못 라우팅되지 않게 보장)
        //   3) `_master.json` → master.real (1차-26)
        //   4) 그 외 → clean.real (1차-21 default)
        let fsRoot: string
        if (relativePath.endsWith('.mart.json')) {
          fsRoot = MART_REAL_ROOT
        } else if (relativePath.endsWith('.real.json')) {
          fsRoot = INDICATOR_REAL_ROOT
        } else if (relativePath.endsWith('_master.json')) {
          fsRoot = MASTER_REAL_ROOT
        } else {
          fsRoot = CLEAN_REAL_ROOT
        }
        const filePath = normalize(join(fsRoot, relativePath))
        if (!filePath.startsWith(fsRoot + sep) && filePath !== fsRoot) {
          res.statusCode = 400
          res.end()
          return
        }
        try {
          const content = await readFile(filePath, 'utf-8')
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(content)
        } catch {
          res.statusCode = 404
          res.end()
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), etlDataMiddlewarePlugin()],
})
