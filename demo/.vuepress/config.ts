import { defineUserConfig } from 'vuepress'
import { defaultTheme } from '@vuepress/theme-default'
import { viteBundler } from '@vuepress/bundler-vite'
import { ragSearchPlugin } from '../../src/node'

export default defineUserConfig({
  lang: 'zh-CN',
  title: 'RAG Search Demo',
  description: 'VuePress RAG 搜索插件演示',
  bundler: viteBundler(),
  theme: defaultTheme(),
  plugins: [
    ragSearchPlugin({
      baseUrl: 'http://localhost:8080',
      token: {
        type: 'localStorage',
        storageKey: 'rag_token',
      },
    }),
  ],
})
