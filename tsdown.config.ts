import { defineConfig } from 'tsdown'
import ApiSnapshot from 'tsnapi/rolldown'

export default defineConfig({
  dts: {
    tsgo: true,
  },
  exports: {
    bin: true,
  },
  entry: ['./src/{index,run}.ts'],
  publint: true,
  attw: {
    profile: 'esm-only',
  },
  plugins: [
    ApiSnapshot(),
  ],
})
