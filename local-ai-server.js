const http = require('http');
const url = require('url');

// Mock Mistral API for local testing
async function mockMistralAPI(text, options = {}) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simple text improvements for testing
  let improvedText = text;
  
  // Basic grammar fixes
  improvedText = improvedText.replace(/their are/gi, 'there are');
  improvedText = improvedText.replace(/misteaks/gi, 'mistakes');
  improvedText = improvedText.replace(/sentance/gi, 'sentence');
  improvedText = improvedText.replace(/grammer/gi, 'grammar');
  improvedText = improvedText.replace(/improvment/gi, 'improvement');
  
  return improvedText;
}

const server = http.createServer(async (req, res) => {
  // Enable CORS for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  console.log(`${req.method} ${req.url}`);
  
  if (req.method === 'POST' && req.url === '/.netlify/functions/ai-proofread') {
    try {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const { text, tone = 'professional', style = 'formal', focus = 'grammar' } = JSON.parse(body);
          
          if (!text) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Text is required' }));
            return;
          }
          
          console.log('Local AI processing:', text.substring(0, 50) + '...');
          
          // Use mock API for local testing
          const improvedText = await mockMistralAPI(text, { tone, style, focus });
          
          console.log('AI response:', improvedText.substring(0, 50) + '...');
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            originalText: text,
            improvedText: improvedText,
            text: improvedText, // Add this field for compatibility
            tone: tone,
            style: style,
            focus: focus
          }));
          
        } catch (error) {
          console.error('Local AI error:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'Internal server error',
            message: error.message
          }));
        }
      });
      
    } catch (error) {
      console.error('Request error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Request failed' }));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🤖 Local AI server running on http://localhost:${PORT}`);
  console.log(`🔗 Endpoint: http://localhost:${PORT}/.netlify/functions/ai-proofread`);
});
