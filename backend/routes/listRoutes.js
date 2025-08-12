const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const listController = require('../controllers/listController');

router.use(auth);

router.post('/add', listController.addItem);
router.put('/update/:itemId', listController.updateItem);
router.delete('/:itemId', listController.deleteItem);
router.get('/', listController.getLists);
router.get('/stats', listController.getStats);

module.exports = router;
