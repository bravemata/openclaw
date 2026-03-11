#!/usr/bin/env node

/**
 * sAGi VFS Explorer - Phase 204
 * Agentic RAG 3.0 Foundation
 * Autonomous investigation tool for Multi-Agent Systems.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The VFS root is fixed to ensure security. 
// Agents can only navigate within this directory.
const VFS_ROOT = process.env.SAGI_VFS_ROOT || path.join(process.env.HOME, '.sagi/vfs_root');

// Ensure VFS_ROOT exists
if (!fs.existsSync(VFS_ROOT)) {
    try {
        fs.mkdirSync(VFS_ROOT, { recursive: true });
    } catch (err) {
        console.error(`Fatal: Failed to create VFS_ROOT at ${VFS_ROOT}`);
        process.exit(1);
    }
}

/**
 * Resolves a virtual path to an absolute physical path.
 * Prevents directory traversal attacks.
 */
function resolvePath(virtualPath) {
    if (!virtualPath) virtualPath = '/';
    // Remove leading slash for path.join
    const normalizedVPath = virtualPath.startsWith('/') ? virtualPath.slice(1) : virtualPath;
    const absPath = path.resolve(VFS_ROOT, normalizedVPath);
    
    if (!absPath.startsWith(path.resolve(VFS_ROOT))) {
        throw new Error('Access denied: Path is outside VFS_ROOT boundary.');
    }
    return absPath;
}

const commands = {
    /**
     * Lists contents of a virtual directory.
     */
    ls: (vPath) => {
        const absPath = resolvePath(vPath);
        if (!fs.existsSync(absPath)) return `Error: Path ${vPath} does not exist.`;
        
        const stats = fs.statSync(absPath);
        if (stats.isDirectory()) {
            const items = fs.readdirSync(absPath);
            if (items.length === 0) return '(Empty directory)';
            
            return items.map(file => {
                const fPath = path.join(absPath, file);
                const fStats = fs.statSync(fPath);
                const type = fStats.isDirectory() ? '[DIR]' : '[FILE]';
                const size = fStats.isFile() ? ` (${(fStats.size / 1024).toFixed(1)} KB)` : '';
                return `${type}\t${file}${size}`;
            }).join('\n');
        }
        return `[FILE]\t${path.basename(absPath)} (${(stats.size / 1024).toFixed(1)} KB)`;
    },

    /**
     * Reads a specific line range from a file to avoid token overflow.
     */
    read: (vPath, startLine = 1, endLine = 100) => {
        const absPath = resolvePath(vPath);
        if (!fs.existsSync(absPath)) return `Error: File ${vPath} not found.`;
        if (fs.statSync(absPath).isDirectory()) return `Error: ${vPath} is a directory. Use 'ls' instead.`;

        const content = fs.readFileSync(absPath, 'utf8').split('\n');
        const totalLines = content.length;
        const start = Math.max(1, parseInt(startLine));
        const end = Math.min(totalLines, parseInt(endLine));
        
        const slice = content.slice(start - 1, end);
        const header = `--- CONTENT OF ${vPath} (Lines ${start}-${end} of ${totalLines}) ---`;
        return `${header}\n${slice.join('\n')}\n--- END OF CHUNK ---`;
    },

    /**
     * Searches for a pattern within the VFS using grep.
     */
    grep: (pattern, vPath) => {
        const absPath = resolvePath(vPath || '/');
        if (!fs.existsSync(absPath)) return `Error: Path ${vPath} not found.`;

        try {
            // Using system grep for performance
            // We escape the pattern to prevent command injection
            const escapedPattern = pattern.replace(/"/g, '\\"');
            const output = execSync(`grep -rEi "${escapedPattern}" "${absPath}" | head -n 50`, { 
                encoding: 'utf8',
                timeout: 5000 
            });
            
            if (!output.trim()) return 'No matches found.';
            
            // Normalize paths in output to be relative to VFS_ROOT
            return output.split('\n')
                .filter(line => line.trim())
                .map(line => line.replace(VFS_ROOT, ''))
                .join('\n');
        } catch (e) {
            if (e.status === 1) return 'No matches found.';
            return `Error searching: ${e.message}`;
        }
    }
};

const [,, cmd, ...args] = process.argv;

if (!commands[cmd]) {
    console.log('sAGi VFS Explorer v1.0');
    console.log('Usage: vfs_explorer.js <ls|read|grep> [arguments]');
    console.log('\nExamples:');
    console.log('  vfs_explorer.js ls /documents');
    console.log('  vfs_explorer.js read /info.txt 1 50');
    console.log('  vfs_explorer.js grep "target string" /data');
    process.exit(1);
}

try {
    const result = commands[cmd](...args);
    process.stdout.write(result + '\n');
} catch (e) {
    process.stderr.write(`Execution Error: ${e.message}\n`);
    process.exit(1);
}
