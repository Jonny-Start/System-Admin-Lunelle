const { google } = require('googleapis');
const stream = require('stream');

// Configurar cliente de Google Drive
const getDriveService = () => {
  try {
    // Primero, si el usuario tiene un REFRESH_TOKEN configurado, usaremos OAuth2 (Recomendado para evitar el error de cuota)
    if (process.env.GOOGLE_REFRESH_TOKEN) {
      const oAuth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );

      oAuth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      });

      return google.drive({ version: 'v3', auth: oAuth2Client });
    }

    // Fallback: usar Service Account original (falla si la Service Account no tiene cuota)
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    
    // Verificar si el usuario todavía tiene los datos falsos del .env.example
    if (credentials.private_key === '...' || credentials.project_id === '...') {
      throw new Error('Debes configurar tus credenciales de Google Drive en el archivo .env');
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file']
    });
    return google.drive({ version: 'v3', auth });
  } catch (error) {
    console.error('Error inicializando Google Drive Service:', error.message);
    throw new Error('Error de configuración de Google Drive: ' + error.message);
  }
};

/**
 * Sube un archivo a Google Drive
 * @param {Object} fileObject Objeto file de Multer
 * @returns {Promise<Object>} Información del archivo subido (id, webViewLink)
 */
exports.uploadFileToDrive = async (fileObject) => {
  const drive = getDriveService();
  if (!drive) throw new Error('Servicio de Google Drive no configurado correctamente');

  const bufferStream = new stream.PassThrough();
  bufferStream.end(fileObject.buffer);

  const fileMetadata = {
    name: `${Date.now()}_${fileObject.originalname}`,
    parents: [process.env.GOOGLE_DRIVE_FOLDER_ID] // Carpeta destino
  };

  const media = {
    mimeType: fileObject.mimetype,
    body: bufferStream
  };

  try {
    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink'
    });
    
    // Dar permisos públicos para lectura
    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      }
    });

    return file.data;
  } catch (error) {
    console.error('Error subiendo archivo a Drive:', error);
    throw error;
  }
};

/**
 * Obtiene el stream de un archivo de Google Drive (para proxy)
 * @param {String} fileId ID del archivo en Google Drive
 * @returns {Promise<{stream: ReadableStream, mimeType: string}>}
 */
exports.getFileStream = async (fileId) => {
  const drive = getDriveService();
  if (!drive || !fileId) throw new Error('Drive no configurado o fileId vacío');

  // Obtener metadata para saber el mimeType
  const fileMeta = await drive.files.get({ fileId, fields: 'mimeType' });

  // Descargar el contenido del archivo
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );

  return { stream: response.data, mimeType: fileMeta.data.mimeType };
};

/**
 * Elimina un archivo de Google Drive
 * @param {String} fileId ID del archivo en Google Drive
 */
exports.deleteFileFromDrive = async (fileId) => {
  const drive = getDriveService();
  if (!drive || !fileId) return;

  try {
    await drive.files.delete({ fileId });
  } catch (error) {
    console.error('Error eliminando archivo de Drive:', error);
  }
};
