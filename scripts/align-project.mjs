import fs from 'fs';
import path from 'path';

const serverPath = path.join(process.cwd(), 'server.ts');

if (fs.existsSync(serverPath)) {
    console.log('🔍 server.ts found. Normalizing Firebase Admin configuration hooks...');
    let content = fs.readFileSync(serverPath, 'utf-8');
    
    // Inject explicit project synchronization mapping to bypass default shell environment leakage
    if (content.includes('admin.initializeApp(')) {
        content = content.replace(
            /admin\.initializeApp\(([^)]*)\)/g, 
            `admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID
})`
        );
        fs.writeFileSync(serverPath, content, 'utf-8');
        console.log('✅ Success: server.ts updated to strictly synchronize project contexts.');
    } else {
        console.log('✨ Initialization structure already aligned.');
    }
} else {
    console.error('❌ Error: server.ts not found.');
}
