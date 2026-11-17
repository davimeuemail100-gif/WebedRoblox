// api/auth.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const { action, username, password } = req.body;

  // Aqui você conectaria no seu banco (Vercel KV, por exemplo)
  // Exemplo de checagem de nome:
  if (action === 'register') {
    if (username === 'Exeless') {
      return res.status(400).json({ error: 'Este nome é reservado para o criador (Admin).' });
    }
    
    // Simulação de banco de dados para você testar
    const dbFake = ['Player1', 'Noob']; 
    if (dbFake.includes(username)) {
      return res.status(400).json({ error: 'Nome já cadastrado! Escolha outro.' });
    }

    // No futuro, salve no banco aqui
    return res.status(200).json({ 
      ok: true, 
      token: "token_secreto_123", 
      isAdmin: username === 'Exeless' 
    });
  }

  if (action === 'login') {
    // Validar se a senha bate
    return res.status(200).json({ 
      ok: true, 
      token: "token_secreto_123", 
      isAdmin: username === 'Exeless' // Só o dono tem Executor
    });
  }

  return res.status(400).json({ error: 'Ação inválida' });
}
