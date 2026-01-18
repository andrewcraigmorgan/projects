import { join } from 'path'
import { generateOpenApiSpec } from '../utils/apiDocs'

/**
 * @group Documentation
 * @description Serves the API documentation with Swagger UI
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  // If requesting the spec, return JSON
  if (query.spec === 'true') {
    const apiDir = join(process.cwd(), 'server', 'api')
    const spec = generateOpenApiSpec(apiDir)
    return spec
  }

  // Otherwise serve Swagger UI HTML
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Projects API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body {
      margin: 0;
      padding: 0;
    }
    .swagger-ui .topbar {
      display: none;
    }
    .swagger-ui .info {
      margin: 20px 0;
    }
    .swagger-ui .info .title {
      font-size: 2rem;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: '/docs?spec=true',
        dom_id: '#swagger-ui',
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: 'BaseLayout',
        deepLinking: true,
        showExtensions: true,
        showCommonExtensions: true,
        defaultModelsExpandDepth: -1,
        docExpansion: 'list',
        filter: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      });
    };
  </script>
</body>
</html>
`

  setHeader(event, 'Content-Type', 'text/html')
  return html
})
