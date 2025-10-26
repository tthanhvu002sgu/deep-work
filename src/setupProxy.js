const fs = require('fs');
const path = require('path');

module.exports = function(app) {
  app.post('/api/save-data', (req, res) => {
    try {
      const filePath = path.join(__dirname, '../public/deepwork-data.json');
      const data = JSON.stringify(req.body, null, 2);
      
      fs.writeFileSync(filePath, data, 'utf-8');
      
      res.json({ success: true, message: 'Data saved successfully' });
    } catch (error) {
      console.error('Error saving file:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
};