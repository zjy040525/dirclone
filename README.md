# dirclone

A simple CLI tool to clone a directory from a URL into a specified output directory.

## Usage

```bash
npx dirclone [url] [options]
```

### CLI Options

The following options are available when running the CLI:

| Option            | Short Flag | Description                                         | Default Value                                     |
| ----------------- | ---------- | --------------------------------------------------- | ------------------------------------------------- |
| `--root <path>`   | `-r`       | Base directory to clone into                        | `./` (current directory)                          |
| `--output <path>` | `-o`       | Output directory for the cloned repository          | Derived from the URL (e.g., `hostname/user/repo`) |
| `--yes`           | `-y`       | Skip all interactive prompts and use default values | `false`                                           |
| `--help`          | `-h`       | Display help for command                            |                                                   |
| `--version`       | `-v`       | Display version number                              |                                                   |

## Development

- Install dependencies:

```bash
pnpm install
```

- Run the unit tests:

```bash
pnpm run test
```

- Build the library:

```bash
pnpm run build
```
