import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vuepress'
import type { RAGSearchPluginOptions } from '../types'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export const ragSearchPlugin = (options: RAGSearchPluginOptions): Plugin => {
  return {
    name: 'vuepress-plugin-ragsearch',
    define: {
      __RAG_OPTIONS__: JSON.stringify(options),
    },
    clientConfigFile: path.resolve(__dirname, '../client/config.ts'),
  }
}
