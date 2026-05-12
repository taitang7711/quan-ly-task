const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars-long!!';
const IV_LENGTH = 16;

function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  if (!text || !text.includes(':')) return text;
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function getAIConfig(pool, userId) {
  // Try user-specific config first
  let [rows] = await pool.query(
    'SELECT * FROM ai_config WHERE user_id = ? AND is_active = TRUE',
    [userId]
  );
  
  // Fall back to global config
  if (rows.length === 0) {
    [rows] = await pool.query(
      'SELECT * FROM ai_config WHERE user_id IS NULL AND is_active = TRUE LIMIT 1'
    );
  }
  
  if (rows.length === 0) {
    return null;
  }
  
  const config = rows[0];
  config.api_key = decrypt(config.api_key_encrypted);
  return config;
}

async function callLLM(pool, userId, prompt, systemPrompt = null, options = {}) {
  const config = await getAIConfig(pool, userId);
  if (!config) {
    throw new Error('No AI configuration found. Please configure AI settings.');
  }
  
  const startTime = Date.now();
  let response = null;
  let modelUsed = config.model_name;
  
  try {
    switch (config.provider) {
      case 'openai':
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: config.api_key });
        const messages = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
        messages.push({ role: 'user', content: prompt });
        const completion = await openai.chat.completions.create({
          model: config.model_name,
          messages: messages,
          temperature: options.temperature || config.temperature || 0.7,
          max_tokens: options.max_tokens || config.max_tokens || 1000
        });
        response = completion.choices[0].message.content;
        break;
        
      case 'anthropic':
        const Anthropic = require('@anthropic-ai/sdk');
        const anthropic = new Anthropic({ apiKey: config.api_key });
        const systemMsg = systemPrompt || '';
        const msg = await anthropic.messages.create({
          model: config.model_name,
          max_tokens: options.max_tokens || config.max_tokens || 1000,
          temperature: options.temperature || config.temperature || 0.7,
          system: systemMsg,
          messages: [{ role: 'user', content: prompt }]
        });
        response = '';
        for (const block of msg.content) {
          if (block.type === 'text') { response += block.text; }
        }
        if (!response) response = msg.content[0]?.text || JSON.stringify(msg.content);
        break;
        
      case 'google':
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(config.api_key);
        const model = genAI.getGenerativeModel({ model: config.model_name });
        const fullPrompt = systemPrompt ? systemPrompt + '\n\n' + prompt : prompt;
        const result = await model.generateContent(fullPrompt);
        response = result.response.text();
        break;
        
      case 'openai_compatible':
        const OpenAICompatible = require('openai');
        const client = new OpenAICompatible({
          apiKey: config.api_key,
          baseURL: config.base_url || 'http://localhost:8080/v1'
        });
        const compatMessages = [];
        if (systemPrompt) compatMessages.push({ role: 'system', content: systemPrompt });
        compatMessages.push({ role: 'user', content: prompt });
        const compatCompletion = await client.chat.completions.create({
          model: config.model_name,
          messages: compatMessages,
          temperature: options.temperature || config.temperature || 0.7,
          max_tokens: options.max_tokens || config.max_tokens || 1000
        });
        response = compatCompletion.choices[0].message.content;
        break;
        
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
    
    const latency = Date.now() - startTime;
    return { response, modelUsed, latency };
  } catch (error) {
    console.error('LLM call error:', error);
    throw new Error(`AI service error: ${error.message}`);
  }
}

async function summarizeTask(pool, userId, taskTitle, taskDescription, comments = []) {
  const prompt = `Hãy tóm tắt task sau đây một cách ngắn gọn (2-3 câu):

Tiêu đề: ${taskTitle}
Mô tả: ${taskDescription || 'Không có mô tả'}
${comments.length > 0 ? `Comments: ${comments.join('; ')}` : ''}

Tóm tắt ngắn gọn:`;
  
  const systemPrompt = 'Bạn là trợ lý AI chuyên tóm tắt công việc trong hệ thống quản lý task. Hãy tóm tắt ngắn gọn, súc tích, nêu rõ nội dung chính và trạng thái.';
  
  const result = await callLLM(pool, userId, prompt, systemPrompt, { max_tokens: 200 });
  return result;
}

async function summarizeReport(pool, userId, reportData) {
  const prompt = `Hãy tóm tắt báo cáo công việc sau đây:

${JSON.stringify(reportData, null, 2)}

Tóm tắt bằng tiếng Việt, nêu bật:
- Số lượng task hoàn thành, đang làm, quá hạn
- Các task nổi bật cần chú ý
- Xu hướng năng suất
- Đề xuất cải thiện (nếu có)

Tóm tắt (3-5 câu):`;
  
  const systemPrompt = 'Bạn là chuyên gia phân tích báo cáo công việc. Hãy cung cấp tóm tắt chuyên nghiệp, trung thực và hữu ích.';
  
  const result = await callLLM(pool, userId, prompt, systemPrompt, { max_tokens: 500 });
  return result;
}

module.exports = {
  encrypt,
  decrypt,
  getAIConfig,
  callLLM,
  summarizeTask,
  summarizeReport
};
