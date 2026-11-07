import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const distIndex = 'dist/index.html'

if (!existsSync(distIndex)) {
  const build = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', shell: true })
  if (build.status !== 0) {
    process.exit(build.status ?? 1)
  }
}

if (!existsSync(distIndex)) {
  console.error('Build did not produce dist/index.html')
  process.exit(1)
}

const preview = spawnSync('npx', ['wrangler', 'preview'], { stdio: 'inherit', shell: true })
process.exit(preview.status ?? 0)
