// Tool configuration schemas used by GenericConfigForm
// Each schema contains:
//   id: string (unique identifier)
//   title: display title
//   fields: array of { key, label, type, placeholder, required, options }
// Supported field types: text, password, number, select, textarea

export const AISchema = {
  id: 'ai',
  title: 'AI 服务',
  fields: [
    { key: 'name', label: '名称', type: 'text', placeholder: 'MyAI', required: true },
    { key: 'description', label: '工具介绍', type: 'textarea', placeholder: '请描述这个AI工具的功能和用途...', required: true },
    { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'API Key' },
    { key: 'apiUrl', label: 'API 地址', type: 'text', placeholder: 'https://api.example.com', required: true },
    { key: 'models', label: '模型列表', type: 'text', placeholder: 'model-a, model-b' },
  ],
};

export const MCPStdIOSchema = {
  id: 'mcp_stdio',
  title: 'MCP STDIO 服务器',
  fields: [
    { key: 'name', label: '服务器名称', type: 'text', placeholder: 'my-mcp', required: true },
    { key: 'description', label: '工具介绍', type: 'textarea', placeholder: '请描述这个工具的功能和用途...', required: true },
    { key: 'command', label: '命令', type: 'text', placeholder: 'npx', required: true },
    { key: 'args', label: '参数', type: 'text', placeholder: '-y excel-mcp-server stdio' },
    { key: 'timeout', label: '超时时间 (毫秒)', type: 'number', placeholder: '60000', required: false },
    { key: 'env', label: '环境变量', type: 'kvlist' },
  ],
};

export const MCPHTTPSchema = {
  id: 'mcp_http',
  title: 'MCP HTTP 服务器',
  fields: [
    { key: 'name', label: '服务器名称', type: 'text', placeholder: 'my-http-mcp', required: true },
    { key: 'description', label: '工具介绍', type: 'textarea', placeholder: '请描述这个工具的功能和用途...', required: true },
    { key: 'url', label: '网址', type: 'text', placeholder: 'http://localhost:3800', required: true },
    { key: 'timeout', label: '超时时间 (毫秒)', type: 'number', placeholder: '60000', required: false },
  ],
};

export const APISchema = {
  id: 'api',
  title: '通用 API 工具',
  fields: [
    { key: 'name', label: '工具名称', type: 'text', placeholder: 'MyAPI', required: true },
    { key: 'description', label: '工具介绍', type: 'textarea', placeholder: '请描述这个API工具的功能和用途...', required: true },
    { key: 'baseUrl', label: '基础网址', type: 'text', placeholder: 'https://api.example.com', required: true },
    { key: 'apiKey', label: 'API 密钥', type: 'password', placeholder: 'API Key' },
    { key: 'timeout', label: '超时时间 (毫秒)', type: 'number', placeholder: '60000' },
  ],
};

// MCP平台账户配置模式
export const MCPPlatformAccountSchema = {
  id: 'mcp_platform_account',
  title: 'MCP 平台账户配置',
  fields: [
    { key: 'platform', label: '平台类型', type: 'select', options: [
      { value: 'modelscope', label: '魔搭社区 MCP 广场' },
      { key: 'tencent_cloudbase', label: '腾讯云开发者社区' }
    ], required: true },
    { key: 'username', label: '用户名/账号', type: 'text', placeholder: '您的平台账号', required: true },
    { key: 'apiKey', label: 'API Key/Token', type: 'password', placeholder: '平台API密钥', required: true },
    { key: 'sseEndpoint', label: 'SSE 连接端点', type: 'text', placeholder: 'wss://platform.com/sse' },
  ],
};

// 腾讯云开发者社区专用配置
export const TencentCloudBaseSchema = {
  id: 'tencent_cloudbase',
  title: '腾讯云开发者社区账户',
  fields: [
    { key: 'secretId', label: 'TENCENTCLOUD_SECRETID', type: 'password', placeholder: '腾讯云 SecretId', required: true },
    { key: 'secretKey', label: 'TENCENTCLOUD_SECRETKEY', type: 'password', placeholder: '腾讯云 SecretKey', required: true },
    { key: 'sessionToken', label: 'TENCENTCLOUD_SESSIONTOKEN', type: 'password', placeholder: '会话令牌（可选）' },
    { key: 'envId', label: 'CLOUDBASE_ENV_ID', type: 'text', placeholder: '云开发环境 ID', required: true },
  ],
};

// 魔搭社区MCP广场配置
export const ModelScopeMCPSchema = {
  id: 'modelscope_mcp',
  title: '魔搭社区 MCP 广场',
  fields: [
    { key: 'username', label: '魔搭社区用户名', type: 'text', placeholder: '您的魔搭社区用户名', required: true },
    { key: 'apiToken', label: 'API Token', type: 'password', placeholder: '魔搭社区 API Token', required: true },
    { key: 'sseEndpoint', label: 'SSE 连接端点', type: 'text', placeholder: 'wss://modelscope.cn/mcp/sse' },
  ],
};

export const SCHEMAS_BY_ID = {
  [AISchema.id]: AISchema,
  [MCPStdIOSchema.id]: MCPStdIOSchema,
  [MCPHTTPSchema.id]: MCPHTTPSchema,
  [APISchema.id]: APISchema,
}; 