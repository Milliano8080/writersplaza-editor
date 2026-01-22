// Backup Management Utility
const backupManager = {
  // Maximum number of backups to keep
  maxBackups: 5,
  
  // Clean up old backup files
  cleanupOldBackups: function() {
    try {
      const backupPattern = /^.*\.backup(_\d{8}_\d{6})?$/;
      const files = [
        'app.js.backup', 'app.js.backup_', 'index.html.backup', 'index.html.backup_',
        'styles.css.backup', 'styles.css.backup_', 'templates.js.backup', 'templates.js.backup_'
      ];
      
      // Remove old backup files
      files.forEach(file => {
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(file);
          }
        } catch (e) {
          console.warn(`Failed to remove backup ${file}:`, e);
        }
      });
      
      console.log('Backup cleanup completed');
      return true;
    } catch (error) {
      console.error('Backup cleanup failed:', error);
      return false;
    }
  },
  
  // Create a timestamped backup
  createBackup: function(filename, content) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const backupName = `${filename}.backup_${timestamp}`;
      
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(backupName, content);
        console.log(`Backup created: ${backupName}`);
      }
      return true;
    } catch (error) {
      console.error('Failed to create backup:', error);
      return false;
    }
  },
  
  // Get backup statistics
  getBackupStats: function() {
    try {
      if (typeof localStorage === 'undefined') return null;
      
      let backupCount = 0;
      let totalSize = 0;
      
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key) && key.includes('.backup')) {
          backupCount++;
          totalSize += localStorage[key].length + key.length;
        }
      }
      
      return {
        backupCount: backupCount,
        totalSize: totalSize,
        totalSizeKB: (totalSize / 1024).toFixed(2)
      };
    } catch (error) {
      console.error('Failed to get backup stats:', error);
      return null;
    }
  }
};

// Auto-cleanup on page load
if (typeof window !== 'undefined') {
  window.addEventListener('load', function() {
    setTimeout(() => {
      backupManager.cleanupOldBackups();
    }, 2000);
  });
}
