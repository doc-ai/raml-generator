import thenify = require('thenify')
import { dirname, resolve } from 'path'
import { loadApi } from 'raml-1-parser'
import yargs = require('yargs')
import mkdrp = require('mkdirp')
import fs = require('fs')
import parseJson = require('parse-json')
import { Generator, Files, GeneratorResult } from './index'

const mkdirp = thenify(mkdrp)
const readFile = thenify(fs.readFile)
const writeFile = thenify(fs.writeFile)

/**
 * Simple `package.json` interface.
 */
export interface Pkg {
  name: string
  description: string
  version: string
}

/**
 * Run the `bin` command for a consumer of the generator.
 */
export function bin (generator: Generator, pkg: Pkg, argv: string[]): Promise<void> {
  const cwd = process.cwd()

  interface Args {
    include: string[]
    data: string
    out: string
  }

  const args = yargs
    .usage(`${pkg.description}\n\n$0 api.raml --out [directory]`)
    .version(pkg.version, 'version')
    .demand('o')
    .alias('o', 'out')
    .describe('o', 'Out directory')
    .alias('d', 'data')
    .describe('d', 'Path to JSON configuration file')
    .array('include')
    .alias('i', 'include')
    .describe('i', 'Include additional RAML files (E.g. extensions)')
    .demand('e')
    .alias('e', 'rejectOnErrors')
    .describe('e', 'rejectOnErrors')
    .parse(argv)

  return loadApi(args._[2],
                 args.include ? args.include as string[] : [],
                 { rejectOnErrors: !!args.rejectOnErrors })
    .then(function (api: any) {
      const json = api.expand(true).toJSON()

      if (args.data == null) {
        return Promise.resolve(generator(json))
      }

      const val = args.data
      if (val) {
        const path = resolve(cwd, val as string)

        return readFile(path, 'utf8')
          .then((contents: any) => parseJson(contents, null, path))
          .then((data: any) => generator(json, data))
      }
    })
    .then(function (output: GeneratorResult) {
      const out = args.out
      if (out) {
        return objectToFs(resolve(cwd, out as string), output.files)
      }
    })
    .then(function () {
      process.exit(0)
    })
    .catch(function (err: any) {
      if (err.parserErrors) {
        err.parserErrors.forEach((parserError: any) => {
          console.error(`${parserError.path} (${parserError.line + 1}, ${parserError.column + 1}): ${parserError.message}`)
        })
      }

      console.error(err.stack || err.message || err)
      process.exit(1)
    })
}

/**
 * Save on object structure to the file system.
 */
function objectToFs (path: string, object: Files) {
  return Object.keys(object).reduce(
    function (promise, file) {
      const content = object[file]
      const filename = resolve(path, file)
      const output = dirname(filename)

      return promise
        .then(function () {
          return mkdirp(output)
        })
        .then(function () {
          return writeFile(filename, content)
        })
    },
    mkdirp(path).then((): any => undefined)
  )
}
