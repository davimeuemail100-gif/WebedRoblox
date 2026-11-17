import { kv } from '@vercel/kv'; // Importa o banco de dados

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const { action, username, password } = req.body;

  if (action === 'register') {
    // 1. Regra: Não pode ter espaço
    if (username.includes(' ')) {
      return res.status(400).json({ error: 'O nome não pode conter espaços.' });
    }

    // 2. Verifica se o nome já existe
    const userExists = await kv.get(`user:${username}`);
    if (userExists) {
      return res.status(400).json({ error: 'Nome já cadastrado! Escolha outro.' });
    }

    const isAdmin = (username === 'Exeless'); // Seu nome de Admin

    // 3. Cria a conta do jogador com lista de amigos vazia (ou com você já dentro)
    const newUser = {
      username,
      password, // Num projeto real, isso seria criptografado (hash)
      isAdmin,
      friends: isAdmin ? [] : ['Exeless'] // Se não for você, já te adiciona
    };

    await kv.set(`user:${username}`, JSON.stringify(newUser));

    // 4. Se for um jogador novo, adiciona ele na SUA lista de amigos (Exeless)
    if (!isAdmin) {
      const adminData = await kv.get('user:Exeless');
      if (adminData) {
        const admin = JSON.parse(adminData);
        // Só adiciona se não estourar o seu limite de 1000 amigos
        if (admin.friends.length < 1000) {
          admin.friends.push(username);
          await kv.set('user:Exeless', JSON.stringify(admin));
        }
      }
    }

    return res.status(200).json({ 
      ok: true, 
      token: "token_secreto_" + username, 
      isAdmin 
    });
  }

  if (action === 'login') {
    const userData = await kv.get(`user:${username}`);
    if (!userData) return res.status(400).json({ error: 'Usuário não encontrado.' });
    
    const user = JSON.parse(userData);
    if (user.password !== password) return res.status(400).json({ error: 'Senha incorreta.' });

    return res.status(200).json({ 
      ok: true, 
      token: "8#+835#&##6" + username, 
      isAdmin: user.isAdmin,
      friends: user.friends
    });
  }

  return res.status(400).json({ error: 'Ação inválida' });
}
