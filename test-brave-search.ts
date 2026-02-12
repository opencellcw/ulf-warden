import axios from 'axios';

async function searchBrave(query: string, count: number = 10) {
  const apiKey = 'BSAB9Dco9-hrsVnlfajXfDZb_M4Xw_h';
  
  try {
    console.log(`🔍 Pesquisando: "${query}"\n`);
    
    const response = await axios.get(
      'https://api.search.brave.com/res/v1/web/search',
      {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': apiKey
        },
        params: {
          q: query,
          count: count,
          search_lang: 'en',
          safesearch: 'moderate'
        },
        timeout: 10000
      }
    );

    const results = response.data.web?.results || [];
    
    console.log(`📊 Encontrados ${results.length} resultados:\n`);
    console.log('='.repeat(80));
    
    results.forEach((result: any, index: number) => {
      console.log(`\n${index + 1}. ${result.title}`);
      console.log(`🔗 ${result.url}`);
      console.log(`📝 ${result.description}`);
      if (result.age) console.log(`📅 ${result.age}`);
      
      if (result.extra_snippets && result.extra_snippets.length > 0) {
        console.log(`📄 Contexto adicional:`);
        result.extra_snippets.slice(0, 2).forEach((snippet: string) => {
          console.log(`   • ${snippet}`);
        });
      }
      console.log('-'.repeat(80));
    });
    
    return results;
  } catch (error: any) {
    console.error('❌ Erro:', error.response?.data || error.message);
    throw error;
  }
}

// Pesquisas sobre clawdbot
const queries = [
  'clawdbot monetization how to make money',
  'clawdbot discord bot revenue',
  'clawdbot business model pricing',
  'making money with AI discord bots'
];

(async () => {
  for (const query of queries) {
    await searchBrave(query, 5);
    console.log('\n\n' + '='.repeat(80) + '\n\n');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limit
  }
})();
