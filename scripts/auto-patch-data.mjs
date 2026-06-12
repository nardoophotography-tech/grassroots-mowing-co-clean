import fs from 'fs';
import path from 'path';

const hookPath = path.join(process.cwd(), 'src', 'hooks', 'useFirebase.ts');

if (fs.existsSync(hookPath)) {
    console.log('🔍 useFirebase.ts found. Inspecting database constraints...');
    let content = fs.readFileSync(hookPath, 'utf-8');
    
    // Force useJobs to fetch ALL active statuses including 'new' web bookings
    if (content.includes("where('status', '==") || content.includes('where("status", "==') || content.includes('["scheduled"')) {
        console.log('🛠️ Found restrictive dashboard filter inside useJobs hook. Patching...');
        // Broaden any constrained status arrays to explicitly include 'new'
        content = content.replace(/\[\s*['"]quoted['"]\s*,\s*['"]scheduled['"]/g, "['new', 'quoted', 'scheduled'");
        content = content.replace(/['"]scheduled['"]\s*,\s*['"]in-progress['"]/g, "'new', 'scheduled', 'in-progress'");
        fs.writeFileSync(hookPath, content, 'utf-8');
        console.log('✅ Success: useFirebase.ts successfully updated.');
    } else {
        console.log('✨ Data stream query looks clean, no restrictive filters found.');
    }
} else {
    console.error('❌ Error: Could not find useFirebase.ts at expected path.');
}
