import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ⚠️ base を自分のGitHubリポジトリ名に変更してください
// 例: リポジトリが https://github.com/yourname/uta-archive なら '/uta-archive/'
export default defineConfig({
  plugins: [react()],
  base: '/uta-archive/',
})
