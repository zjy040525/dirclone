export interface CommonOptions {
  root?: string
  cwd?: string
}

export interface SchemaOptions extends CommonOptions {
  $schema?: string
}
