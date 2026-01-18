import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

interface ApiEndpoint {
  path: string
  method: string
  group: string
  description: string
  authenticated: boolean
  urlParams: ParamDoc[]
  queryParams: ParamDoc[]
  bodyParams: ParamDoc[]
  responses: ResponseDoc[]
}

interface ParamDoc {
  name: string
  type: string
  required: boolean
  description: string
}

interface ResponseDoc {
  status: number
  example: string
}

interface OpenApiSpec {
  openapi: string
  info: {
    title: string
    version: string
    description: string
  }
  servers: { url: string }[]
  tags: { name: string; description: string }[]
  paths: Record<string, Record<string, unknown>>
  components: {
    securitySchemes: Record<string, unknown>
  }
}

// Parse Scribe-style docblock from file content
function parseDocblock(content: string): Partial<ApiEndpoint> | null {
  const docblockMatch = content.match(/\/\*\*[\s\S]*?\*\//)
  if (!docblockMatch) return null

  const docblock = docblockMatch[0]
  const result: Partial<ApiEndpoint> = {
    urlParams: [],
    queryParams: [],
    bodyParams: [],
    responses: [],
    authenticated: false,
  }

  // Parse @group
  const groupMatch = docblock.match(/@group\s+(.+)/)
  if (groupMatch) result.group = groupMatch[1].trim()

  // Parse @description
  const descMatch = docblock.match(/@description\s+(.+)/)
  if (descMatch) result.description = descMatch[1].trim()

  // Parse @authenticated
  if (docblock.includes('@authenticated')) {
    result.authenticated = true
  }

  // Parse @urlParam
  const urlParamRegex = /@urlParam\s+(\w+)\s+(\w+)\s+(required|optional)?\s*(.*)/g
  let match
  while ((match = urlParamRegex.exec(docblock)) !== null) {
    result.urlParams!.push({
      name: match[1],
      type: match[2],
      required: match[3] === 'required',
      description: match[4]?.trim() || '',
    })
  }

  // Parse @queryParam
  const queryParamRegex = /@queryParam\s+(\w+)\s+(\w+)\s+(required|optional)?\s*(.*)/g
  while ((match = queryParamRegex.exec(docblock)) !== null) {
    result.queryParams!.push({
      name: match[1],
      type: match[2],
      required: match[3] === 'required',
      description: match[4]?.trim() || '',
    })
  }

  // Parse @bodyParam
  const bodyParamRegex = /@bodyParam\s+(\w+)\s+(\w+)\s+(required|optional)?\s*(.*)/g
  while ((match = bodyParamRegex.exec(docblock)) !== null) {
    result.bodyParams!.push({
      name: match[1],
      type: match[2],
      required: match[3] === 'required',
      description: match[4]?.trim() || '',
    })
  }

  // Parse @response
  const responseRegex = /@response\s+(\d+)\s+(.+)/g
  while ((match = responseRegex.exec(docblock)) !== null) {
    result.responses!.push({
      status: parseInt(match[1]),
      example: match[2].trim(),
    })
  }

  return result
}

// Convert file path to API path
function filePathToApiPath(filePath: string, baseDir: string): { path: string; method: string } {
  let relativePath = relative(baseDir, filePath)
    .replace(/\.ts$/, '')
    .replace(/\\/g, '/')

  // Extract method from filename
  const methodMatch = relativePath.match(/\.(get|post|put|patch|delete)$/i)
  const method = methodMatch ? methodMatch[1].toLowerCase() : 'get'
  relativePath = relativePath.replace(/\.(get|post|put|patch|delete)$/i, '')

  // Handle index files
  relativePath = relativePath.replace(/\/index$/, '')

  // Convert [param] to {param}
  relativePath = relativePath.replace(/\[([^\]]+)\]/g, '{$1}')

  return {
    path: `/api/${relativePath}`,
    method,
  }
}

// Recursively find all API files
function findApiFiles(dir: string): string[] {
  const files: string[] = []

  const items = readdirSync(dir)
  for (const item of items) {
    const fullPath = join(dir, item)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      files.push(...findApiFiles(fullPath))
    } else if (item.endsWith('.ts') && !item.startsWith('_')) {
      files.push(fullPath)
    }
  }

  return files
}

// Map param type to OpenAPI type
function mapType(type: string): { type: string; format?: string } {
  const typeMap: Record<string, { type: string; format?: string }> = {
    string: { type: 'string' },
    number: { type: 'integer' },
    boolean: { type: 'boolean' },
    datetime: { type: 'string', format: 'date-time' },
    date: { type: 'string', format: 'date' },
  }
  return typeMap[type.toLowerCase()] || { type: 'string' }
}

// Generate OpenAPI spec from API files
export function generateOpenApiSpec(apiDir: string): OpenApiSpec {
  const files = findApiFiles(apiDir)
  const endpoints: ApiEndpoint[] = []
  const groups = new Set<string>()

  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8')
      const docblock = parseDocblock(content)
      const { path, method } = filePathToApiPath(file, apiDir)

      if (docblock) {
        endpoints.push({
          path,
          method,
          group: docblock.group || 'General',
          description: docblock.description || '',
          authenticated: docblock.authenticated || false,
          urlParams: docblock.urlParams || [],
          queryParams: docblock.queryParams || [],
          bodyParams: docblock.bodyParams || [],
          responses: docblock.responses || [],
        })

        if (docblock.group) {
          groups.add(docblock.group)
        }
      }
    } catch {
      // Skip files that can't be read
    }
  }

  // Build OpenAPI spec
  const spec: OpenApiSpec = {
    openapi: '3.0.3',
    info: {
      title: 'Projects API',
      version: '1.0.0',
      description: 'API documentation for the Projects application - a Zoho Projects replacement',
    },
    servers: [
      { url: 'http://localhost:3000' },
    ],
    tags: Array.from(groups).map((g) => ({ name: g, description: '' })),
    paths: {},
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
        },
      },
    },
  }

  // Add endpoints to paths
  for (const endpoint of endpoints) {
    if (!spec.paths[endpoint.path]) {
      spec.paths[endpoint.path] = {}
    }

    const operation: Record<string, unknown> = {
      tags: [endpoint.group],
      summary: endpoint.description,
      description: endpoint.description,
    }

    // Add security if authenticated
    if (endpoint.authenticated) {
      operation.security = [{ bearerAuth: [] }, { apiKey: [] }]
    }

    // Add parameters
    const parameters: unknown[] = []

    for (const param of endpoint.urlParams) {
      parameters.push({
        name: param.name,
        in: 'path',
        required: true,
        description: param.description,
        schema: mapType(param.type),
      })
    }

    for (const param of endpoint.queryParams) {
      parameters.push({
        name: param.name,
        in: 'query',
        required: param.required,
        description: param.description,
        schema: mapType(param.type),
      })
    }

    if (parameters.length > 0) {
      operation.parameters = parameters
    }

    // Add request body
    if (endpoint.bodyParams.length > 0) {
      const properties: Record<string, unknown> = {}
      const required: string[] = []

      for (const param of endpoint.bodyParams) {
        properties[param.name] = {
          ...mapType(param.type),
          description: param.description,
        }
        if (param.required) {
          required.push(param.name)
        }
      }

      operation.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties,
              required: required.length > 0 ? required : undefined,
            },
          },
        },
      }
    }

    // Add responses
    const responses: Record<string, unknown> = {}
    for (const response of endpoint.responses) {
      try {
        const example = JSON.parse(response.example)
        responses[response.status.toString()] = {
          description: response.status < 400 ? 'Success' : 'Error',
          content: {
            'application/json': {
              example,
            },
          },
        }
      } catch {
        responses[response.status.toString()] = {
          description: response.example,
        }
      }
    }

    if (Object.keys(responses).length === 0) {
      responses['200'] = { description: 'Success' }
    }

    operation.responses = responses

    spec.paths[endpoint.path][endpoint.method] = operation
  }

  return spec
}
