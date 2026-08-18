export interface ClickhouseConfig {
  database: string
  password: string
  url: string
  username: string
}

export function getClickhouseConfig(): ClickhouseConfig | null {
  const url = process.env.CLICKHOUSE_URL
  if (!url) {
    return null
  }

  return {
    url,
    database: process.env.CLICKHOUSE_DATABASE ?? 'keenpix',
    username: process.env.CLICKHOUSE_USER ?? 'default',
    password: process.env.CLICKHOUSE_PASSWORD ?? '',
  }
}

export function clickhouseEnabled() {
  return getClickhouseConfig() !== null
}
