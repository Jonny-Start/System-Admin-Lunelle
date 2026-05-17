require('dotenv').config();
const { google } = require('googleapis');
const http = require('http');
const url = require('url');

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = 'http://localhost:3001/oauth2callback';

if (!clientId || !clientSecret) {
  console.error("Faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en tu .env");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  redirectUri
);

// Generar URL de autorización
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/drive.file'],
  prompt: 'consent' // Fuerza a pedir permisos y dar refresh_token de nuevo
});

console.log('=============================================');
console.log('Autoriza a la aplicación abriendo esta URL:');
console.log(authUrl);
console.log('=============================================');
console.log('Esperando respuesta en http://localhost:3001...');

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/oauth2callback')) {
    const q = url.parse(req.url, true).query;
    if (q.error) {
      console.log('Error:', q.error);
      res.end('Error de autorización: ' + q.error);
    } else if (q.code) {
      try {
        const { tokens } = await oauth2Client.getToken(q.code);
        console.log('\n--- ¡Éxito! ---');
        console.log('Copia la siguiente línea y pégala en tu archivo .env:\n');
        console.log(`GOOGLE_REFRESH_TOKEN='${tokens.refresh_token}'`);
        console.log('\nLuego de agregarlo al .env, ya puedes borrar este script (get-drive-token.js) y probar nuevamente la app.');
        res.end('Token generado con exito. Revisa tu terminal.');
        server.close();
        process.exit(0);
      } catch (err) {
        console.error('Error obteniendo el token:', err);
        res.end('Error al obtener el token.');
      }
    }
  }
});

server.listen(3001);
