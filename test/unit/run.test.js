/**
 * Tests for the run.sh script
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('run.sh Script', () => {
  // Path to the script
  const scriptPath = path.join(__dirname, '../../run.sh');
  
  it('should exist and be executable', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);
    
    // Check if it's executable (only works on Unix-like systems)
    if (process.platform !== 'win32') {
      const stats = fs.statSync(scriptPath);
      const isExecutable = !!(stats.mode & fs.constants.S_IXUSR);
      expect(isExecutable).toBe(true);
    }
  });
  
  it('should check for the krep binary', () => {
    // Read the script content
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    
    // Check if it contains the key components
    expect(scriptContent).toContain('KREP_PATH=');
    expect(scriptContent).toContain('if [ ! -f "$KREP_PATH" ]');
    expect(scriptContent).toContain('make');
  });
  
  it('should install dependencies if needed', () => {
    // Read the script content
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    
    // Check if it contains the dependency check
    expect(scriptContent).toContain('if [ ! -d "$(dirname "$0")/node_modules" ]');
    expect(scriptContent).toContain('npm install');
  });
  
  it('should start the server', () => {
    // Read the script content
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    
    // Check if it contains the server start command
    expect(scriptContent).toContain('npm start');
  });
});